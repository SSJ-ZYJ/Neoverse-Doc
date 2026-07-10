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
import { ANIMATION_SNAPSHOT, ANIMATION_Z_INDEX } from '@/lib/animation-constants';

// sessionStorage key for the transition snapshot (single source of truth).
// 过渡快照的 sessionStorage 键名（唯一来源）。
export const TRANSITION_STORAGE_KEY = 'nd-docs-transition';
const TRANSITION_HOLD_OVERLAY_ID = 'nd-route-transition-hold';

// TTL: snapshots older than this are considered stale and ignored.
// 有效期：超过此时间的快照视为过期并忽略。
const TRANSITION_TTL_MS = ANIMATION_SNAPSHOT.ttl;

// Full payload written to sessionStorage.
// 写入 sessionStorage 的完整载荷。
interface TransitionSnapshot {
  x: number;
  y: number;
  domHTML: string;
  scrollY: number;
  layoutWidth: number;
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
  layoutWidth: number;
  sourcePath: string;
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
// Keep the pre-BFCache-fix behavior of preferring <main>: cloning the full
// Fumadocs layout can force navbar/grid recalculation inside the fixed overlay
// and produce a visible pre-animation flash.
// Docs pages still fall back to #nd-docs-layout because Fumadocs docs content
// is not always wrapped by a <main>.
// 解析主内容节点用于快照捕获。
// 保持 BFCache 修复前的行为：优先捕获 <main>。克隆完整 Fumadocs 布局会让
// 导航栏 / grid 在固定遮罩层内重新计算，容易产生动画前闪帧。
// 文档页仍回退到 #nd-docs-layout，因为 Fumadocs 文档内容不一定包在 <main> 中。
function resolveMainNode(): Element | null {
  const mains = document.querySelectorAll('main');
  for (const main of mains) {
    if (!isInsideTransitionLayer(main)) {
      return main;
    }
  }

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
  const snapshotNode = normalizeSnapshotNode(mainNode);
  const layoutWidth = document.documentElement.clientWidth || window.innerWidth;

  return {
    x,
    y,
    domHTML: snapshotNode.outerHTML,
    scrollY: window.scrollY,
    layoutWidth,
    sourcePath: window.location.pathname,
    ts: Date.now(),
    isTransitioning: true,
  };
}

// Normalize transient animation state before serializing the clone. The live
// homepage keeps `.home-route-shell--enter` after its entry animation finishes;
// if that class is cloned into the fixed transition overlay, CSS restarts from
// the blurred/transparent first frame and creates the white flash on click.
// 序列化克隆节点前清理临时动画状态。真实首页入场动画结束后仍保留
// `.home-route-shell--enter`；如果该 class 被克隆进固定过渡遮罩，CSS 会从
// 模糊 / 透明首帧重新播放，从而在点击瞬间形成白色模糊闪屏。
function normalizeSnapshotNode(sourceNode: Element): Element {
  const clone = sourceNode.cloneNode(true) as Element;
  const animatedShells = [
    ...(clone.matches('.home-route-shell--enter') ? [clone] : []),
    ...Array.from(clone.querySelectorAll('.home-route-shell--enter')),
  ];

  for (const shell of animatedShells) {
    shell.classList.remove('home-route-shell--enter');

    if (shell instanceof HTMLElement) {
      shell.style.animation = 'none';
      shell.style.opacity = '1';
      shell.style.filter = 'none';
      shell.style.transform = 'none';
    }
  }

  return clone;
}

function writeTransitionSnapshot(data: TransitionSnapshot): void {
  sessionStorage.setItem(TRANSITION_STORAGE_KEY, JSON.stringify(data));
}

// Wrap cloned markup in the same layout width as the source page. Fixed
// overlays use the visual viewport, while the real page content is centered in
// documentElement.clientWidth (excluding the scrollbar); preserving that width
// prevents the homepage title from nudging sideways on click.
// 用源页面相同的布局宽度包裹克隆标记。fixed 遮罩使用视觉视口，而真实页面内容
// 基于 documentElement.clientWidth（不含滚动条）居中；保持该宽度可避免点击时
// 首页大标题横向挪动。
export function renderTransitionSnapshotHTML(data: TransitionSnapshotData): string {
  const width = Number.isFinite(data.layoutWidth) && data.layoutWidth > 0 ? data.layoutWidth : 0;
  const widthStyle = width > 0 ? `width:${width}px;max-width:${width}px;` : '';
  const scrollStyle =
    data.scrollY > 0 ? `transform:translateY(${-data.scrollY}px);will-change:transform;` : '';

  return `<div style="${widthStyle}${scrollStyle}">${data.domHTML}</div>`;
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
  const layoutWidth = data.layoutWidth || document.documentElement.clientWidth || window.innerWidth;
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'right:auto',
    `z-index:${ANIMATION_Z_INDEX.transitionHold}`,
    `width:${layoutWidth}px`,
    'height:100vh',
    'overflow:hidden',
    'pointer-events:none',
    'background:var(--background, #fff)',
    'contain:paint',
  ].join(';');
  overlay.innerHTML = renderTransitionSnapshotHTML(data);

  document.body.appendChild(overlay);
}

// Capture the current <main> outerHTML + click point into sessionStorage so
// MaskReveal can play the radial cutout transition on the destination page.
// Uses resolveActivationPoint to handle keyboard activation (zero coordinates)
// by falling back to the anchor's bounding rect center.
// 将当前 <main> 外层 HTML 与点击坐标写入 sessionStorage，
// 供目标页的 MaskReveal 播放径向镂空过渡动画。
// 使用 resolveActivationPoint 处理键盘激活（坐标为 0）的情况，
// 回退到锚点的包围矩形中心。
export function captureTransitionSnapshot(event: MouseEvent<HTMLAnchorElement>): void {
  if (typeof window === 'undefined') return;

  const { x, y } = resolveActivationPoint(event, event.currentTarget);
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
        layoutWidth:
          typeof data.layoutWidth === 'number'
            ? data.layoutWidth
            : document.documentElement.clientWidth || window.innerWidth,
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

// --- Path & activation helpers (shared by transition components) ---
// --- 路径与激活判断工具（供过渡组件共用） ---

// Normalize a pathname by stripping trailing slashes. Root "/" is preserved.
// 规范化路径：去除尾部斜杠，根路径 "/" 保留。
export function normalizePathname(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '');
  return normalized.length > 0 ? normalized : '/';
}

// Check whether a pointer/mouse event is a plain primary (left-click without
// modifier keys) activation. Shared by EnterDocsButton and MaskReveal's global
// click capture to keep the two code paths in sync.
// 判断指针 / 鼠标事件是否为普通主键激活（左键且无修饰键）。EnterDocsButton 与
// MaskReveal 全局 click 捕获共用，保证两处判断逻辑一致。
export function isPlainPrimaryActivation(event: {
  defaultPrevented: boolean;
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): boolean {
  return !(
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

// Resolve the activation point from a mouse/pointer event, falling back to the
// anchor's bounding rect center when the event has zero coordinates (keyboard
// activation / synthetic click). Unified to eliminate three copies of the same
// fallback logic.
// 从鼠标 / 指针事件解析激活坐标，当事件坐标为 0 时回退到锚点中心
// （键盘激活 / 合成点击）。统一实现，消除三处重复的回退逻辑。
export function resolveActivationPoint(
  event: { clientX: number; clientY: number },
  currentTarget?: { getBoundingClientRect: () => DOMRect } | null,
): { x: number; y: number } {
  let { clientX: x, clientY: y } = event;
  if (x === 0 && y === 0 && currentTarget) {
    const rect = currentTarget.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
  }
  return { x, y };
}

// --- Route-group classification ---
// --- 路由组分类 ---

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
