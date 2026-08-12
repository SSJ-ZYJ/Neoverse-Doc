// Transient global spotlight for search-result navigation.
// 搜索结果跳转后的短时全局聚光灯。
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getDocsPageElement } from '@/adapters/fumadocs/dom';
import { MOTION_DURATION_MS, prefersReducedMotion } from '@/runtime/motion/config';
import { getNavigationSnapshot } from '@/runtime/navigation/store';
import { getSpotlightScrollDelta, SEARCH_SPOTLIGHT_PARAM } from '../spotlight';

const MAX_TARGET_ATTEMPTS = 180;
const MAX_SEARCH_NAVIGATION_ATTEMPTS = 120;
const SPOTLIGHT_DURATION_MS = 3_200;
const REDUCED_MOTION_DURATION_MS = 1_800;
const SPOTLIGHT_PADDING_PX = 12;

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface SpotlightNavigation {
  key: string;
  pathname: string;
  target: string;
}

function getSpotlightNavigation(url: URL, key: string): SpotlightNavigation | null {
  const target = url.searchParams.get(SEARCH_SPOTLIGHT_PARAM);
  if (!target || url.origin !== window.location.origin) return null;
  return { key, pathname: url.pathname, target };
}

function getAnchorElement(): HTMLElement | null {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;

  try {
    return document.getElementById(decodeURIComponent(hash));
  } catch {
    return document.getElementById(hash);
  }
}

function textNodeFollowsAnchor(node: Node, anchor: HTMLElement | null): boolean {
  if (!anchor || anchor.contains(node)) return true;
  return Boolean(anchor.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function findTextRange(
  root: HTMLElement,
  target: string,
  anchor: HTMLElement | null,
): Range | null {
  const normalizedTarget = target.toLocaleLowerCase();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    if (textNodeFollowsAnchor(node, anchor)) {
      const content = node.textContent ?? '';
      const index = content.toLocaleLowerCase().indexOf(normalizedTarget);
      if (index >= 0) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + target.length);
        return range;
      }
    }
    node = walker.nextNode();
  }

  return null;
}

function getRangeRect(range: Range): DOMRect | null {
  const rects = Array.from(range.getClientRects()).filter(
    (rect) => rect.width > 0 && rect.height > 0,
  );
  if (rects.length === 0) return null;

  const left = Math.min(...rects.map((rect) => rect.left));
  const right = Math.max(...rects.map((rect) => rect.right));
  const top = Math.min(...rects.map((rect) => rect.top));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return new DOMRect(left, top, right - left, bottom - top);
}

function clampSpotlightRect(rect: DOMRect): SpotlightRect {
  const left = Math.max(0, rect.left - SPOTLIGHT_PADDING_PX);
  const right = Math.min(window.innerWidth, rect.right + SPOTLIGHT_PADDING_PX);
  const top = Math.max(0, rect.top - SPOTLIGHT_PADDING_PX);
  const bottom = Math.min(window.innerHeight, rect.bottom + SPOTLIGHT_PADDING_PX);

  return {
    top,
    left,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function centerSpotlightRect(rect: DOMRect, behavior: ScrollBehavior): boolean {
  const delta = getSpotlightScrollDelta(rect, window.innerHeight);
  if (Math.abs(delta) < 1) return false;
  window.scrollBy({ top: delta, behavior });
  return true;
}

function removeSpotlightParam(expectedPathname: string, expectedTarget: string): void {
  const url = new URL(window.location.href);
  if (url.pathname !== expectedPathname) return;
  if (url.searchParams.get(SEARCH_SPOTLIGHT_PARAM) !== expectedTarget) return;

  url.searchParams.delete(SEARCH_SPOTLIGHT_PARAM);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

export function SearchSpotlight() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeTarget = searchParams.get(SEARCH_SPOTLIGHT_PARAM);
  const [clickedNavigation, setClickedNavigation] = useState<SpotlightNavigation | null>(null);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [visible, setVisible] = useState(false);
  const navigationSequence = useRef(0);
  const lastHandledDestination = useRef<string | null>(null);

  const routeNavigation = useMemo<SpotlightNavigation | null>(
    () =>
      routeTarget
        ? {
            key: `route:${pathname}:${routeTarget}`,
            pathname,
            target: routeTarget,
          }
        : null,
    [pathname, routeTarget],
  );
  const navigation = clickedNavigation ?? routeNavigation;

  useEffect(() => {
    let navigationFrameId = 0;

    const queueNavigation = (url: URL) => {
      navigationSequence.current += 1;
      const next = getSpotlightNavigation(url, `link:${navigationSequence.current}`);
      if (next) setClickedNavigation(next);
    };

    const watchForSearchNavigation = (previousHref: string) => {
      window.cancelAnimationFrame(navigationFrameId);
      let attempt = 0;

      const checkUrl = () => {
        const currentUrl = new URL(window.location.href);
        if (currentUrl.href !== previousHref) {
          const next = getSpotlightNavigation(
            currentUrl,
            `button:${navigationSequence.current + 1}`,
          );
          if (next) {
            navigationSequence.current += 1;
            setClickedNavigation(next);
            return;
          }
        }
        if (attempt++ < MAX_SEARCH_NAVIGATION_ATTEMPTS) {
          navigationFrameId = window.requestAnimationFrame(checkUrl);
        }
      };

      navigationFrameId = window.requestAnimationFrame(checkUrl);
    };

    const handleClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;
      const element = event.target instanceof Element ? event.target : null;
      const link = element?.closest<HTMLAnchorElement>('a[href]');
      if (link && !link.download && (!link.target || link.target === '_self')) {
        queueNavigation(new URL(link.href, window.location.href));
        return;
      }
      if (element?.closest('button[aria-selected]')) {
        watchForSearchNavigation(window.location.href);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && document.querySelector('[role="dialog"]')) {
        watchForSearchNavigation(window.location.href);
      }
    };

    const handleHistoryNavigation = () => queueNavigation(new URL(window.location.href));

    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('hashchange', handleHistoryNavigation);
    window.addEventListener('popstate', handleHistoryNavigation);
    return () => {
      window.cancelAnimationFrame(navigationFrameId);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('hashchange', handleHistoryNavigation);
      window.removeEventListener('popstate', handleHistoryNavigation);
    };
  }, []);

  useEffect(() => {
    if (!navigation) return;

    const { key, pathname: targetPathname, target } = navigation;
    const destination = `${targetPathname}\0${target}`;
    if (!clickedNavigation && lastHandledDestination.current === destination) return;

    let attempt = 0;
    let frameId = 0;
    let updateFrameId = 0;
    let hideTimer = 0;
    let removeTimer = 0;
    let interactionTimer = 0;
    let activeRange: Range | null = null;
    let fallbackElement: HTMLElement | null = null;
    let interactionReady = false;
    let closed = false;
    let resolveBeforeUpdate = false;
    let recenterBeforeUpdate = false;
    let root: HTMLElement | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    const reducedMotion = prefersReducedMotion();

    const resolveTarget = () => {
      if (!root) return;
      const anchor = getAnchorElement();
      activeRange = findTextRange(root, target, anchor);
      fallbackElement = activeRange ? (activeRange.startContainer.parentElement ?? anchor) : anchor;
      if (!activeRange && !fallbackElement) fallbackElement = root;
    };

    const getTargetRect = () => {
      if (activeRange && !activeRange.startContainer.isConnected) resolveTarget();
      return activeRange ? getRangeRect(activeRange) : fallbackElement?.getBoundingClientRect();
    };

    const updateRect = () => {
      const targetRect = getTargetRect();
      if (targetRect && targetRect.width > 0 && targetRect.height > 0) {
        setRect(clampSpotlightRect(targetRect));
      }
    };

    const scheduleRectUpdate = (resolve = false, recenter = false) => {
      resolveBeforeUpdate ||= resolve;
      recenterBeforeUpdate ||= recenter;
      window.cancelAnimationFrame(updateFrameId);
      updateFrameId = window.requestAnimationFrame(() => {
        if (resolveBeforeUpdate) {
          resolveTarget();
          resolveBeforeUpdate = false;
        }
        const targetRect = getTargetRect();
        if (
          recenterBeforeUpdate &&
          targetRect &&
          centerSpotlightRect(targetRect, reducedMotion ? 'auto' : 'smooth')
        ) {
          recenterBeforeUpdate = false;
          updateFrameId = window.requestAnimationFrame(updateRect);
          return;
        }
        recenterBeforeUpdate = false;
        updateRect();
      });
    };
    const handleResize = () => scheduleRectUpdate(false, true);
    const handleScroll = () => scheduleRectUpdate();

    const close = () => {
      if (closed) return;
      closed = true;
      lastHandledDestination.current = destination;
      setVisible(false);
      removeSpotlightParam(targetPathname, target);
      window.clearTimeout(hideTimer);
      removeTimer = window.setTimeout(() => setRect(null), MOTION_DURATION_MS.fast);
      setClickedNavigation((current) => (current?.key === key ? null : current));
    };

    const handleInteraction = (event: Event) => {
      if (!interactionReady) return;
      if (event.type !== 'keydown' || (event as KeyboardEvent).key === 'Escape') close();
    };

    const show = () => {
      const currentUrl = new URL(window.location.href);
      root = getDocsPageElement();
      if (
        currentUrl.pathname !== targetPathname ||
        currentUrl.searchParams.get(SEARCH_SPOTLIGHT_PARAM) !== target ||
        !root ||
        getNavigationSnapshot().phase !== 'idle'
      ) {
        if (attempt++ < MAX_TARGET_ATTEMPTS) frameId = window.requestAnimationFrame(show);
        else {
          removeSpotlightParam(targetPathname, target);
          setClickedNavigation((current) => (current?.key === key ? null : current));
        }
        return;
      }

      resolveTarget();
      const observedRoot = root;

      const initialRect = getTargetRect();
      if (initialRect) centerSpotlightRect(initialRect, reducedMotion ? 'auto' : 'smooth');

      frameId = window.requestAnimationFrame(() => {
        updateRect();
        setVisible(true);
        resizeObserver = new ResizeObserver(() => scheduleRectUpdate(false, true));
        resizeObserver.observe(observedRoot);
        mutationObserver = new MutationObserver(() => scheduleRectUpdate(true, true));
        mutationObserver.observe(observedRoot, {
          childList: true,
          characterData: true,
          subtree: true,
        });
        interactionTimer = window.setTimeout(() => {
          interactionReady = true;
        }, MOTION_DURATION_MS.fast);
      });
      hideTimer = window.setTimeout(
        close,
        reducedMotion ? REDUCED_MOTION_DURATION_MS : SPOTLIGHT_DURATION_MS,
      );
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('pointerdown', handleInteraction, true);
    window.addEventListener('wheel', handleInteraction, { capture: true, passive: true });
    window.addEventListener('touchstart', handleInteraction, { capture: true, passive: true });
    window.addEventListener('keydown', handleInteraction, true);
    show();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.cancelAnimationFrame(updateFrameId);
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
      window.clearTimeout(interactionTimer);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('pointerdown', handleInteraction, true);
      window.removeEventListener('wheel', handleInteraction, true);
      window.removeEventListener('touchstart', handleInteraction, true);
      window.removeEventListener('keydown', handleInteraction, true);
    };
  }, [clickedNavigation, navigation]);

  if (!rect) return null;

  return (
    <div aria-hidden="true" className="search-spotlight" data-visible={visible ? '' : undefined}>
      <span
        className="search-spotlight__focus"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
      />
    </div>
  );
}
