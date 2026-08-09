// Cross-document reading return point: records body-link navigation and restores
// the exact source scroll position from a compact floating action.
// 跨文档阅读返回点：记录正文链接跳转，并通过紧凑悬浮操作恢复来源页的准确滚动位置。
'use client';

import { ArrowLeft, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { isPlainInternalNavigation } from '@/components/transition/transition-controller';

const RETURN_POINT_STORAGE_KEY = 'neoverse-docs:reading-return';
const RESTORE_POINT_STORAGE_KEY = 'neoverse-docs:reading-restore';
const RETURN_POINT_LIFETIME_MS = 30 * 60 * 1000;
const RESTORE_SETTLE_MS = 120;

interface ReadingReturnPoint {
  createdAt: number;
  destinationPath: string;
  sourceAnchorPath: number[];
  sourceAnchorViewportTop: number;
  sourceHref: string;
  sourcePath: string;
  sourceScrollY: number;
  sourceTitle: string;
}

interface ReadingRestorePoint {
  previousScrollRestoration: ScrollRestoration;
  sourceAnchorPath: number[];
  sourceAnchorViewportTop: number;
  sourcePath: string;
  sourceScrollY: number;
}

interface DocsReadingReturnProps {
  actionLabel: string;
  ariaLabelTemplate: string;
  dismissLabel: string;
}

function normalizePathname(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '');
  return normalized || '/';
}

function isDocsPath(pathname: string): boolean {
  return pathname.split('/').includes('docs');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isElementPath(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((index) => Number.isInteger(index) && index >= 0)
  );
}

function isReadingReturnPoint(value: unknown): value is ReadingReturnPoint {
  return (
    isRecord(value) &&
    typeof value.createdAt === 'number' &&
    typeof value.destinationPath === 'string' &&
    isElementPath(value.sourceAnchorPath) &&
    typeof value.sourceAnchorViewportTop === 'number' &&
    typeof value.sourceHref === 'string' &&
    typeof value.sourcePath === 'string' &&
    typeof value.sourceScrollY === 'number' &&
    typeof value.sourceTitle === 'string'
  );
}

function isReadingRestorePoint(value: unknown): value is ReadingRestorePoint {
  return (
    isRecord(value) &&
    (value.previousScrollRestoration === 'auto' || value.previousScrollRestoration === 'manual') &&
    isElementPath(value.sourceAnchorPath) &&
    typeof value.sourceAnchorViewportTop === 'number' &&
    typeof value.sourcePath === 'string' &&
    typeof value.sourceScrollY === 'number'
  );
}

function readStoredValue<T>(key: string, validate: (value: unknown) => value is T): T | null {
  try {
    const serialized = window.sessionStorage.getItem(key);
    if (!serialized) return null;
    const value: unknown = JSON.parse(serialized);
    if (!validate(value)) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return value;
  } catch {
    removeStoredValue(key);
    return null;
  }
}

function writeStoredValue(key: string, value: ReadingReturnPoint | ReadingRestorePoint): boolean {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Storage can be unavailable in privacy-restricted browsing contexts.
    // 隐私受限的浏览环境可能无法使用存储，此时保持原生导航行为。
    return false;
  }
}

function removeStoredValue(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Storage cleanup is best-effort when browser access is restricted.
    // 浏览器限制存储访问时，清理操作按尽力而为处理。
  }
}

function readReturnPoint(): ReadingReturnPoint | null {
  const point = readStoredValue(RETURN_POINT_STORAGE_KEY, isReadingReturnPoint);
  if (!point) return null;
  if (Date.now() - point.createdAt <= RETURN_POINT_LIFETIME_MS) return point;
  removeStoredValue(RETURN_POINT_STORAGE_KEY);
  return null;
}

function createElementPath(element: Element, root: Element): number[] | null {
  const path: number[] = [];
  let current = element;

  while (current !== root) {
    const parent = current.parentElement;
    if (!parent || !root.contains(parent)) return null;
    const index = Array.from(parent.children).indexOf(current);
    if (index < 0) return null;
    path.unshift(index);
    current = parent;
  }

  return path;
}

function resolveElementPath(root: Element, path: number[]): HTMLElement | null {
  let current: Element = root;
  for (const index of path) {
    const child = current.children.item(index);
    if (!child) return null;
    current = child;
  }
  return current instanceof HTMLElement ? current : null;
}

export function DocsReadingReturn({
  actionLabel,
  ariaLabelTemplate,
  dismissLabel,
}: DocsReadingReturnProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [returnPoint, setReturnPoint] = useState<ReadingReturnPoint | null>(null);

  // Capture only plain same-origin links inside the MDX body that lead to a
  // different document; external, modified, download, and same-page links stay native.
  // 仅捕获 MDX 正文中跳往另一文档的普通同源链接；外链、组合键、下载与同页链接保持原生行为。
  useEffect(() => {
    const handleDocumentLink = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>('[data-docs-body] a[href]');
      if (!anchor || !isPlainInternalNavigation(event, anchor)) return;

      const destination = new URL(anchor.href, window.location.href);
      const sourcePath = normalizePathname(window.location.pathname);
      const destinationPath = normalizePathname(destination.pathname);
      if (!isDocsPath(destinationPath) || destinationPath === sourcePath) return;

      const docsBody = anchor.closest<HTMLElement>('[data-docs-body]');
      const sourceAnchorPath = docsBody ? createElementPath(anchor, docsBody) : null;
      const sourceTitle = document
        .querySelector<HTMLElement>('[data-docs-title]')
        ?.textContent?.trim();
      if (!sourceAnchorPath || !sourceTitle) return;

      writeStoredValue(RETURN_POINT_STORAGE_KEY, {
        createdAt: Date.now(),
        destinationPath,
        sourceAnchorPath,
        sourceAnchorViewportTop: anchor.getBoundingClientRect().top,
        sourceHref: `${window.location.pathname}${window.location.search}${window.location.hash}`,
        sourcePath,
        sourceScrollY: window.scrollY,
        sourceTitle,
      });
    };

    document.addEventListener('click', handleDocumentLink, { capture: true });
    return () => document.removeEventListener('click', handleDocumentLink, { capture: true });
  }, []);

  // Temporarily materialize deferred MDX blocks and hide the returned article
  // while its exact offset settles, preventing both placeholder drift and visible scrolling.
  // 恢复期间临时展开延迟 MDX 区块并隐藏正文，在精确位置稳定后再显示，
  // 同时避免占位高度偏差和可见滚动。
  useLayoutEffect(() => {
    const currentPath = normalizePathname(pathname);
    const restorePoint = readStoredValue(RESTORE_POINT_STORAGE_KEY, isReadingRestorePoint);
    if (restorePoint?.sourcePath !== currentPath) return;

    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.dataset.ndReadingRestore = '';
    root.style.scrollBehavior = 'auto';
    const docsBody = document.querySelector<HTMLElement>('[data-docs-body]');
    const readingAnchor = docsBody
      ? resolveElementPath(docsBody, restorePoint.sourceAnchorPath)
      : null;

    const restoreScroll = () => {
      const targetTop = readingAnchor
        ? window.scrollY +
          readingAnchor.getBoundingClientRect().top -
          restorePoint.sourceAnchorViewportTop
        : restorePoint.sourceScrollY;
      window.scrollTo({ top: targetTop, left: 0, behavior: 'auto' });
    };
    let finished = false;
    let settleObserver: ResizeObserver | null = null;
    const finishRestore = () => {
      if (finished) return;
      finished = true;
      restoreScroll();
      settleObserver?.disconnect();
      removeStoredValue(RESTORE_POINT_STORAGE_KEY);
      root.style.scrollBehavior = previousScrollBehavior;
      root.removeAttribute('data-nd-reading-restore');
      window.history.scrollRestoration = restorePoint.previousScrollRestoration;
    };

    restoreScroll();
    const layoutFrame = window.requestAnimationFrame(() => {
      restoreScroll();
      window.requestAnimationFrame(restoreScroll);
    });
    if (docsBody && typeof ResizeObserver !== 'undefined') {
      settleObserver = new ResizeObserver(restoreScroll);
      settleObserver.observe(docsBody);
    }
    const settleTimer = window.setTimeout(finishRestore, RESTORE_SETTLE_MS);

    return () => {
      window.cancelAnimationFrame(layoutFrame);
      window.clearTimeout(settleTimer);
      finishRestore();
    };
  }, [pathname]);

  // Resolve the pending return action after a route commit.
  // 路由提交后解析待显示的返回操作。
  useEffect(() => {
    const currentPath = normalizePathname(pathname);
    const point = readReturnPoint();
    if (point?.destinationPath === currentPath) {
      setReturnPoint(point);
    } else {
      setReturnPoint(null);
      if (point) removeStoredValue(RETURN_POINT_STORAGE_KEY);
    }
  }, [pathname]);

  const handleReturn = () => {
    if (!returnPoint) return;

    const restoreStored = writeStoredValue(RESTORE_POINT_STORAGE_KEY, {
      previousScrollRestoration: window.history.scrollRestoration,
      sourceAnchorPath: returnPoint.sourceAnchorPath,
      sourceAnchorViewportTop: returnPoint.sourceAnchorViewportTop,
      sourcePath: returnPoint.sourcePath,
      sourceScrollY: returnPoint.sourceScrollY,
    });
    if (restoreStored) window.history.scrollRestoration = 'manual';
    removeStoredValue(RETURN_POINT_STORAGE_KEY);
    setReturnPoint(null);
    router.back();
  };

  const handleDismiss = () => {
    removeStoredValue(RETURN_POINT_STORAGE_KEY);
    setReturnPoint(null);
  };

  if (!returnPoint) return null;

  const ariaLabel = ariaLabelTemplate.replace('{title}', returnPoint.sourceTitle);

  return createPortal(
    <div className="docs-reading-return" data-reading-return="">
      <button
        aria-label={ariaLabel}
        className="docs-reading-return__back"
        onClick={handleReturn}
        title={ariaLabel}
        type="button"
      >
        <span aria-hidden="true" className="docs-reading-return__icon">
          <ArrowLeft />
        </span>
        <span className="docs-reading-return__action">{actionLabel}</span>
        <span aria-hidden="true" className="docs-reading-return__divider" />
        <span className="docs-reading-return__title">{returnPoint.sourceTitle}</span>
      </button>
      <button
        aria-label={dismissLabel}
        className="docs-reading-return__dismiss"
        onClick={handleDismiss}
        title={dismissLabel}
        type="button"
      >
        <X aria-hidden="true" />
      </button>
    </div>,
    document.body,
  );
}
