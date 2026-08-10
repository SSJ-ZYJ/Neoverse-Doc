// Transient global spotlight for search-result navigation.
// 搜索结果跳转后的短时全局聚光灯。
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MOTION_DURATION_MS, prefersReducedMotion } from '@/lib/motion-config';
import { SEARCH_SPOTLIGHT_PARAM } from '@/lib/search-spotlight';

const DOCS_PAGE_SELECTOR = '#nd-page';
const ROUTE_TRANSITION_SELECTOR =
  '[data-nd-route-transition], [data-nd-route-transition-pending], [data-nd-route-transition-outgoing], [data-nd-route-transition-capturing], [data-nd-route-transition-particles]';
const MAX_TARGET_ATTEMPTS = 180;
const SPOTLIGHT_DURATION_MS = 3_200;
const REDUCED_MOTION_DURATION_MS = 1_800;
const SPOTLIGHT_PADDING_PX = 12;

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
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
  const target = searchParams.get(SEARCH_SPOTLIGHT_PARAM);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!target) return;

    let attempt = 0;
    let frameId = 0;
    let hideTimer = 0;
    let removeTimer = 0;
    let interactionTimer = 0;
    let activeRange: Range | null = null;
    let fallbackElement: HTMLElement | null = null;
    let interactionReady = false;
    let closed = false;
    const reducedMotion = prefersReducedMotion();

    const updateRect = () => {
      const targetRect = activeRange
        ? getRangeRect(activeRange)
        : fallbackElement?.getBoundingClientRect();
      if (targetRect && targetRect.width > 0 && targetRect.height > 0) {
        setRect(clampSpotlightRect(targetRect));
      }
    };

    const close = () => {
      if (closed) return;
      closed = true;
      setVisible(false);
      removeSpotlightParam(pathname, target);
      window.clearTimeout(hideTimer);
      removeTimer = window.setTimeout(() => setRect(null), MOTION_DURATION_MS.fast);
    };

    const handleInteraction = (event: Event) => {
      if (!interactionReady) return;
      if (event.type !== 'keydown' || (event as KeyboardEvent).key === 'Escape') close();
    };

    const show = () => {
      const root = document.querySelector<HTMLElement>(DOCS_PAGE_SELECTOR);
      if (!root || document.documentElement.querySelector(ROUTE_TRANSITION_SELECTOR)) {
        if (attempt++ < MAX_TARGET_ATTEMPTS) frameId = window.requestAnimationFrame(show);
        else removeSpotlightParam(pathname, target);
        return;
      }

      const anchor = getAnchorElement();
      activeRange = findTextRange(root, target, anchor);
      fallbackElement = activeRange ? (activeRange.startContainer.parentElement ?? anchor) : anchor;
      if (!activeRange && !fallbackElement) fallbackElement = root;

      const focusElement = activeRange?.startContainer.parentElement ?? fallbackElement;
      const initialRect = activeRange
        ? getRangeRect(activeRange)
        : fallbackElement?.getBoundingClientRect();
      if (
        focusElement &&
        initialRect &&
        (initialRect.top < 96 || initialRect.bottom > window.innerHeight - 72)
      ) {
        focusElement.scrollIntoView({
          behavior: reducedMotion ? 'auto' : 'smooth',
          block: 'center',
        });
      }

      frameId = window.requestAnimationFrame(() => {
        updateRect();
        setVisible(true);
        interactionTimer = window.setTimeout(() => {
          interactionReady = true;
        }, MOTION_DURATION_MS.fast);
      });
      hideTimer = window.setTimeout(
        close,
        reducedMotion ? REDUCED_MOTION_DURATION_MS : SPOTLIGHT_DURATION_MS,
      );
    };

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('pointerdown', handleInteraction, true);
    window.addEventListener('wheel', handleInteraction, { capture: true, passive: true });
    window.addEventListener('touchstart', handleInteraction, { capture: true, passive: true });
    window.addEventListener('keydown', handleInteraction, true);
    show();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
      window.clearTimeout(interactionTimer);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('pointerdown', handleInteraction, true);
      window.removeEventListener('wheel', handleInteraction, true);
      window.removeEventListener('touchstart', handleInteraction, true);
      window.removeEventListener('keydown', handleInteraction, true);
    };
  }, [pathname, target]);

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
