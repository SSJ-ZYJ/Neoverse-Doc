// Cross-document reading return point: records body-link navigation and restores
// the exact source scroll position from a compact floating action.
// 跨文档阅读返回点：记录正文链接跳转，并通过紧凑悬浮操作恢复来源页的准确滚动位置。
'use client';

import { ArrowLeft, X } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { isPlainInternalNavigation } from '@/runtime/navigation/event';
import { DOCS_REFRESH_POINT_STORAGE_KEY } from './restore';

const RETURN_POINT_STORAGE_KEY = 'neoverse-docs:reading-return';
const RESTORE_POINT_STORAGE_KEY = 'neoverse-docs:reading-restore';
const RETURN_POINT_LIFETIME_MS = 30 * 60 * 1000;
const RESTORE_SETTLE_MS = 120;
const REFRESH_RESTORE_SETTLE_MS = 500;
const RESTORE_MAX_WAIT_MS = 2500;

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

interface ReadingRefreshPoint {
  createdAt: number;
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

function isReadingRefreshPoint(value: unknown): value is ReadingRefreshPoint {
  return (
    isRecord(value) &&
    typeof value.createdAt === 'number' &&
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

function writeStoredValue(
  key: string,
  value: ReadingReturnPoint | ReadingRestorePoint | ReadingRefreshPoint,
): boolean {
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

function isReloadNavigation(): boolean {
  const navigation = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;
  return navigation?.type === 'reload';
}

function findViewportAnchor(root: Element): HTMLElement | null {
  const referenceTop = Math.min(192, Math.max(96, window.innerHeight * 0.2));
  const children = Array.from(root.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );
  return (
    children.find((child) => child.getBoundingClientRect().bottom >= referenceTop) ??
    children.at(-1) ??
    null
  );
}

export function DocsReadingReturn({
  actionLabel,
  ariaLabelTemplate,
  dismissLabel,
}: DocsReadingReturnProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [returnPoint, setReturnPoint] = useState<ReadingReturnPoint | null>(null);
  const restoreCleanupTimerRef = useRef(0);

  // Save a stable body-child anchor immediately before the document leaves.
  // A subsequent reload can restore its viewport offset even when deferred
  // blocks or Mermaid placeholders above it resolve to different heights.
  // 文档离开前保存稳定的正文直属锚点；刷新后即使上方延迟区块或 Mermaid
  // 占位解析为不同高度，也能恢复该锚点在视口中的原始偏移。
  useEffect(() => {
    const captureRefreshPoint = () => {
      const sourceScrollY = window.scrollY;
      if (sourceScrollY <= 0) {
        removeStoredValue(DOCS_REFRESH_POINT_STORAGE_KEY);
        return;
      }

      const docsBody = document.querySelector<HTMLElement>('[data-docs-body]');
      const anchor = docsBody ? findViewportAnchor(docsBody) : null;
      const sourceAnchorPath = docsBody && anchor ? createElementPath(anchor, docsBody) : null;
      if (!anchor || !sourceAnchorPath) return;

      writeStoredValue(DOCS_REFRESH_POINT_STORAGE_KEY, {
        createdAt: Date.now(),
        sourceAnchorPath,
        sourceAnchorViewportTop: anchor.getBoundingClientRect().top,
        sourcePath: normalizePathname(window.location.pathname),
        sourceScrollY,
      });
    };

    window.addEventListener('pagehide', captureRefreshPoint);
    return () => window.removeEventListener('pagehide', captureRefreshPoint);
  }, []);

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

  // Materialize deferred MDX blocks while the exact offset settles and keep
  // their measured sizes for the restored route. Returned articles remain hidden
  // during correction; refreshes retain the surface and fade its contents in.
  // 恢复期间展开延迟 MDX 区块并校正精确位置，在当前路由持续保留已测量尺寸。
  // 返回时暂时隐藏正文；刷新时保留卡片表面，并在校正结束后淡入内容。
  useLayoutEffect(() => {
    window.clearTimeout(restoreCleanupTimerRef.current);
    restoreCleanupTimerRef.current = 0;
    const currentPath = normalizePathname(pathname);
    const returnRestorePoint = readStoredValue(RESTORE_POINT_STORAGE_KEY, isReadingRestorePoint);
    const refreshPoint = isReloadNavigation()
      ? readStoredValue(DOCS_REFRESH_POINT_STORAGE_KEY, isReadingRefreshPoint)
      : null;
    const restorePoint =
      returnRestorePoint?.sourcePath === currentPath
        ? returnRestorePoint
        : refreshPoint?.sourcePath === currentPath
          ? refreshPoint
          : null;
    const root = document.documentElement;
    if (!restorePoint) {
      root.removeAttribute('data-nd-reading-restore');
      root.removeAttribute('data-nd-reading-restored');
      root.removeAttribute('data-nd-refresh-restore');
      root.removeAttribute('data-nd-refresh-restored');
      if (refreshPoint) removeStoredValue(DOCS_REFRESH_POINT_STORAGE_KEY);
      return;
    }

    const isRefreshRestore = restorePoint === refreshPoint;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.dataset.ndReadingRestore = '';
    if (isRefreshRestore) {
      root.removeAttribute('data-nd-reading-restored');
      root.dataset.ndRefreshRestore = '';
    } else {
      root.removeAttribute('data-nd-refresh-restore');
      root.removeAttribute('data-nd-refresh-restored');
    }
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
    let settleTimer = 0;
    let maxTimer = 0;
    const settleDelay = isRefreshRestore ? REFRESH_RESTORE_SETTLE_MS : RESTORE_SETTLE_MS;
    const finishRestore = () => {
      if (finished) return;
      finished = true;
      restoreScroll();
      settleObserver?.disconnect();
      window.clearTimeout(settleTimer);
      window.clearTimeout(maxTimer);
      if (isRefreshRestore) {
        root.dataset.ndRefreshRestored = '';
        removeStoredValue(DOCS_REFRESH_POINT_STORAGE_KEY);
      } else {
        root.dataset.ndReadingRestored = '';
        removeStoredValue(RESTORE_POINT_STORAGE_KEY);
        if ('previousScrollRestoration' in restorePoint) {
          window.history.scrollRestoration = restorePoint.previousScrollRestoration;
        }
      }
      root.style.scrollBehavior = previousScrollBehavior;
      root.removeAttribute('data-nd-reading-restore');
      root.removeAttribute('data-nd-refresh-restore');
    };

    const scheduleFinish = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(finishRestore, settleDelay);
    };

    restoreScroll();
    let secondLayoutFrame = 0;
    const layoutFrame = window.requestAnimationFrame(() => {
      restoreScroll();
      secondLayoutFrame = window.requestAnimationFrame(restoreScroll);
    });
    if (docsBody && typeof ResizeObserver !== 'undefined') {
      settleObserver = new ResizeObserver(() => {
        restoreScroll();
        scheduleFinish();
      });
      settleObserver.observe(docsBody);
    }
    scheduleFinish();
    maxTimer = window.setTimeout(finishRestore, RESTORE_MAX_WAIT_MS);

    return () => {
      window.cancelAnimationFrame(layoutFrame);
      if (secondLayoutFrame) window.cancelAnimationFrame(secondLayoutFrame);
      window.clearTimeout(settleTimer);
      window.clearTimeout(maxTimer);
      settleObserver?.disconnect();
      restoreCleanupTimerRef.current = window.setTimeout(() => {
        if (isRefreshRestore) {
          removeStoredValue(DOCS_REFRESH_POINT_STORAGE_KEY);
        } else {
          removeStoredValue(RESTORE_POINT_STORAGE_KEY);
          if ('previousScrollRestoration' in restorePoint) {
            window.history.scrollRestoration = restorePoint.previousScrollRestoration;
          }
        }
        root.style.scrollBehavior = previousScrollBehavior;
        root.removeAttribute('data-nd-reading-restore');
        root.removeAttribute('data-nd-reading-restored');
        root.removeAttribute('data-nd-refresh-restore');
        root.removeAttribute('data-nd-refresh-restored');
      }, 0);
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
