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

// Capture the current <main> outerHTML + click point into sessionStorage so
// MaskReveal can play the radial cutout transition on the destination page.
// 将当前 <main> 外层 HTML 与点击坐标写入 sessionStorage，
// 供目标页的 MaskReveal 播放径向镂空过渡动画。
export function captureTransitionSnapshot(event: MouseEvent<HTMLAnchorElement>): void {
  if (typeof window === 'undefined') return;

  const { x, y } = resolveClickPoint(event);
  const mainNode = document.querySelector('main');
  if (!mainNode) return;

  const data: TransitionSnapshot = {
    x,
    y,
    domHTML: mainNode.outerHTML,
    scrollY: window.scrollY,
    ts: Date.now(),
    isTransitioning: true,
  };
  sessionStorage.setItem(TRANSITION_STORAGE_KEY, JSON.stringify(data));
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
