// Shared mask-reveal transition snapshot utilities.
// BackLink and EnterDocsButton both snapshot the current <main> DOM into
// sessionStorage before navigating; MaskReveal reads & clears it on mount.
// Centralizing this eliminates 3 copies of the same capture/read/clear logic
// and the hardcoded storage key string.
// 遮罩揭示过渡快照共享工具。
// BackLink 与 EnterDocsButton 在导航前都会将当前 <main> DOM 快照写入 sessionStorage；
// MaskReveal 挂载时读取并清除。集中管理消除 3 处重复的捕获 / 读取 / 清除逻辑
// 及硬编码的 storage key 字符串。

import type { MouseEvent } from 'react';

// sessionStorage key for the transition snapshot (single source of truth).
// 过渡快照的 sessionStorage 键名（唯一来源）。
export const TRANSITION_STORAGE_KEY = 'nd-docs-transition';
const TRANSITION_HOLD_OVERLAY_ID = 'nd-route-transition-hold';

// TTL: snapshots older than 3s are considered stale and ignored.
// 有效期：超过 3 秒的快照视为过期并忽略。
const TRANSITION_TTL_MS = 3000;

// Full payload written to sessionStorage.
// 写入 sessionStorage 的完整载荷。
interface TransitionSnapshot {
  x: number;
  y: number;
  domHTML: string;
  scrollY: number;
  sourcePath: string;
  ts: number;
  isTransitioning: true;
}

// Validated snapshot consumed by MaskReveal.
// MaskReveal 消费的经验证快照。
export interface TransitionSnapshotData {
  x: number;
  y: number;
  domHTML: string;
  scrollY: number;
  sourcePath: string;
}

// Resolve the click origin: falls back to the anchor's center when the event
// has zero coordinates (keyboard activation / synthetic click).
// 解析点击坐标：当事件坐标为 0 时回退到锚点中心（键盘激活 / 合成点击）。
function resolveClickPoint(event: MouseEvent<HTMLAnchorElement>): { x: number; y: number } {
  let { clientX: x, clientY: y } = event;
  if (x === 0 && y === 0) {
    const rect = event.currentTarget.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
  }
  return { x, y };
}

// IDs of the transient transition layers whose cloned DOM must never be
// treated as the "real" page content during snapshot capture.
// 过渡层的临时 ID：捕获快照时绝不能把它们内部的克隆 DOM 当作"真实"页面内容。
const TRANSITION_MASK_ID = 'nd-docs-transition-mask';
const TRANSITION_HOLD_OVERLAY_SELECTOR = `#${TRANSITION_HOLD_OVERLAY_ID}, #${TRANSITION_MASK_ID}`;

// Returns true when the element lives inside an active mask or hold overlay —
// those contain cloned DOM from a previous transition and must be skipped to
// avoid capturing a stale snapshot (the bug that intermittently showed the
// wrong page when navigating during an in-progress 2.5s mask-reveal animation).
// 当元素位于活动遮罩或保底遮罩内部时返回 true —— 它们含有上一次过渡的克隆 DOM，
// 必须跳过，否则会捕获过期快照（即在 2.5 秒遮罩动画进行中导航时偶发显示错误页面的 bug）。
function isInsideTransitionLayer(element: Element | null): boolean {
  if (!element) return false;
  return element.closest(TRANSITION_HOLD_OVERLAY_SELECTOR) !== null;
}

// Resolve the main content node for snapshot capture.
// home layout renders <main id="nd-home-layout">, docs layout renders
// <div id="nd-docs-layout"> — fall back to the docs container when no <main>
// exists, otherwise docs → home transitions can't capture a snapshot.
// Both lookups exclude elements inside the mask / hold overlay, because those
// layers contain cloned DOM (with duplicate <main> / #nd-docs-layout) that
// would otherwise be picked up first — MaskReveal is rendered before
// {children} in [lang]/layout.tsx, so cloned nodes precede the real ones in
// document order and document.querySelector('main') would return the clone.
// 解析主内容节点用于快照捕获。
// home 布局渲染 <main id="nd-home-layout">，docs 布局渲染 <div id="nd-docs-layout"> ——
// 当 <main> 不存在时回退到 docs 容器，否则 docs → home 过渡无法捕获快照。
// 两种查找都排除位于遮罩 / 保底遮罩内部的元素，因为这些层含有克隆 DOM
// （带重复的 <main> / #nd-docs-layout），否则会被优先选中 —— MaskReveal 在
// [lang]/layout.tsx 中渲染在 {children} 之前，克隆节点在文档顺序上先于真实节点，
// document.querySelector('main') 会返回克隆而非真实节点。
function resolveMainNode(): Element | null {
  const mains = document.querySelectorAll('main');
  for (const main of mains) {
    if (!isInsideTransitionLayer(main)) {
      return main;
    }
  }
  // Fall back to the docs layout container, also excluding any clone that
  // might live inside an active transition layer.
  // 回退到 docs 布局容器，同样排除可能位于活动过渡层内的克隆。
  const docsLayouts = document.querySelectorAll('#nd-docs-layout');
  for (const layout of docsLayouts) {
    if (!isInsideTransitionLayer(layout)) {
      return layout;
    }
  }
  return null;
}

function buildTransitionSnapshot(x: number, y: number): TransitionSnapshot | null {
  const mainNode = resolveMainNode();
  if (!mainNode) return null;

  return {
    x,
    y,
    domHTML: mainNode.outerHTML,
    scrollY: window.scrollY,
    sourcePath: window.location.pathname,
    ts: Date.now(),
    isTransitioning: true,
  };
}

function writeTransitionSnapshot(data: TransitionSnapshot): void {
  sessionStorage.setItem(TRANSITION_STORAGE_KEY, JSON.stringify(data));
}

// Immediate hold overlay: covers the App Router gap between link click and
// destination layout paint, preventing a single-frame body-background flash.
// 即时保底遮罩：覆盖链接点击到目标布局绘制之间的 App Router 空窗期，
// 避免出现单帧 body 背景白屏。
function mountTransitionHoldOverlay(data: TransitionSnapshot): void {
  removeTransitionHoldOverlay();

  const overlay = document.createElement('div');
  overlay.id = TRANSITION_HOLD_OVERLAY_ID;
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:9998',
    'width:100vw',
    'height:100vh',
    'overflow:hidden',
    'pointer-events:none',
    'background:var(--background, #fff)',
    'contain:paint',
  ].join(';');
  overlay.innerHTML =
    data.scrollY > 0
      ? `<div style="transform:translateY(${-data.scrollY}px);will-change:transform;">${data.domHTML}</div>`
      : data.domHTML;

  document.body.appendChild(overlay);
}

// Capture the current <main> outerHTML + click point into sessionStorage so
// MaskReveal can play the radial cutout transition on the destination page.
// 将当前 <main> 外层 HTML 与点击坐标写入 sessionStorage，
// 供目标页的 MaskReveal 播放径向镂空过渡动画。
export function captureTransitionSnapshot(event: MouseEvent<HTMLAnchorElement>): void {
  if (typeof window === 'undefined') return;

  const { x, y } = resolveClickPoint(event);
  captureTransitionSnapshotAtPoint(x, y);
}

// Native document click capture uses this point-based helper for links
// generated by fumadocs, where we cannot attach a React onClick handler.
// 原生 document 点击捕获通过坐标版 helper 处理 fumadocs 生成的链接，
// 这些链接无法直接附加 React onClick。
export function captureTransitionSnapshotAtPoint(x: number, y: number): void {
  if (typeof window === 'undefined') return;

  const data = buildTransitionSnapshot(x, y);
  if (!data) return;

  writeTransitionSnapshot(data);
  mountTransitionHoldOverlay(data);
}

// Read and validate a transition snapshot from sessionStorage.
// Returns null if absent, malformed, or older than the TTL.
// 读取并校验 sessionStorage 中的过渡快照。
// 不存在、格式错误或超过有效期时返回 null。
export function readTransitionSnapshot(): TransitionSnapshotData | null {
  if (typeof window === 'undefined') return null;

  const raw = sessionStorage.getItem(TRANSITION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw) as Partial<TransitionSnapshot>;
    if (
      data.isTransitioning &&
      typeof data.ts === 'number' &&
      Date.now() - data.ts < TRANSITION_TTL_MS
    ) {
      return {
        x: data.x ?? 0,
        y: data.y ?? 0,
        domHTML: data.domHTML ?? '',
        scrollY: data.scrollY ?? 0,
        sourcePath: data.sourcePath ?? '',
      };
    }
  } catch {
    // Malformed JSON — treat as no snapshot.
    // JSON 格式错误，视为无快照。
  }
  return null;
}

// Clear the transition flag (read-once semantics: prevents re-trigger on
// refresh or back navigation).
// 清除过渡标志（阅后即焚：避免刷新或后退后误触发）。
export function clearTransitionSnapshot(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TRANSITION_STORAGE_KEY);
}

export function removeTransitionHoldOverlay(): void {
  if (typeof document === 'undefined') return;
  document.getElementById(TRANSITION_HOLD_OVERLAY_ID)?.remove();
}

// --- Route-group classification ---
// --- 路由组分类 ---

function normalizePathname(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '');
  return normalized.length > 0 ? normalized : '/';
}

function getLocalePrefix(pathname: string): string | null {
  const segment = pathname.split('/').filter(Boolean)[0];
  return segment ? `/${segment}` : null;
}

// Returns true when the transition should play mask-reveal (snapshot-based
// radial cutout). Asymmetric by design — only home-group → docs plays
// mask-reveal; docs → home group (root or guestbook) uses page-enter (blur)
// because the user explicitly requested blur transitions in that direction:
//   - docs → home (root): returns false → page-enter (blur).
//   - docs → guestbook: returns false → page-enter (blur).
//   - home (root) → docs: returns true → mask-reveal (EnterDocsButton).
//   - guestbook → docs: returns true → mask-reveal (BackLink).
// Used by MaskReveal (snapshot capture + reveal decision) and home template
// (skipEntry decision). When this returns false, no snapshot is captured and
// the destination's page-enter animation (opacity + scale + blur) runs.
// 当过渡应播放 mask-reveal（基于快照的径向镂空）时返回 true。设计上不对称 ——
// 只有 home 组 → docs 播放 mask-reveal；docs → home 组（根或留言板）改用
// page-enter（模糊），因为用户明确要求该方向用模糊过渡：
//   - docs → home（根）：返回 false → page-enter（模糊）。
//   - docs → guestbook：返回 false → page-enter（模糊）。
//   - home（根）→ docs：返回 true → mask-reveal（EnterDocsButton）。
//   - guestbook → docs：返回 true → mask-reveal（BackLink）。
// 被 MaskReveal（快照捕获 + 揭示决策）与首页 template（skipEntry 决策）使用。
// 返回 false 时不捕获快照，目标页播放 page-enter（opacity + scale + blur）。
export function isCrossRouteGroupTransition(
  sourcePathname: string,
  targetPathname: string,
): boolean {
  const source = normalizePathname(sourcePathname);
  const target = normalizePathname(targetPathname);
  if (source === target) return false;

  const localePrefix = getLocalePrefix(source);
  if (!localePrefix || getLocalePrefix(target) !== localePrefix) return false;

  const docsPrefix = `${localePrefix}/docs`;
  const sourceIsDocs = source === docsPrefix || source.startsWith(`${docsPrefix}/`);
  const targetIsDocs = target === docsPrefix || target.startsWith(`${docsPrefix}/`);
  const sourceIsGuestbook = source.startsWith(`${localePrefix}/guestbook`);
  const targetIsGuestbook = target.startsWith(`${localePrefix}/guestbook`);
  const sourceIsHomeGroup = source === localePrefix || sourceIsGuestbook;
  const targetIsHomeGroup = target === localePrefix || targetIsGuestbook;

  // docs → home group (root or guestbook): use page-enter (blur) instead of
  // mask-reveal. Reverse (home group → docs) keeps mask-reveal for
  // snapshot-based reveal.
  // docs → home 组（根或留言板）：使用 page-enter（模糊）而非 mask-reveal。
  // 反向（home 组 → docs）保留 mask-reveal 基于快照揭示。
  if (sourceIsDocs && targetIsHomeGroup) return false;

  return (
    sourceIsDocs !== targetIsDocs &&
    (sourceIsDocs || sourceIsHomeGroup) &&
    (targetIsDocs || targetIsHomeGroup)
  );
}
