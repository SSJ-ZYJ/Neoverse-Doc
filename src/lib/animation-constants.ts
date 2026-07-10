// Centralized animation design tokens — single source of truth for durations,
// z-index layers, easing curves, and snapshot TTL used across JS-driven and
// CSS-driven animations. CSS custom properties are mirrored in theme.css :root
// so both JS (framer-motion, inline styles) and CSS can reference the same values.
// 集中式动画设计 token —— 时长、z-index 层级、缓动曲线与快照有效期的唯一来源。
// CSS 自定义属性在 theme.css :root 中同步，使 JS（framer-motion、内联样式）与 CSS
// 引用同一组值。

// --- Durations (in milliseconds for JS; CSS uses ms units) ---
// --- 时长（JS 用毫秒；CSS 使用 ms 单位） ---
export const ANIMATION_DURATION = {
  /** Homepage route-enter animation (opacity + blur + scale). / 首页入场动画时长。 */
  pageEnter: 650,
  /** Mask-reveal radial cutout transition duration. / 遮罩揭示径向镂空过渡时长。 */
  maskReveal: 2500,
  /** Route-loading handoff release fade-out. / 路由加载交接释放淡出时长。 */
  loadingRelease: 560,
  /** Glass ripple particle wave duration. / 玻璃波纹粒子波动时长。 */
  ripple: 1880,
  /** Theme (light/dark) switch transition. / 主题（浅色 / 深色）切换过渡时长。 */
  theme: 300,
  /** AI typewriter caret blink cycle. / AI 打字机光标闪烁周期。 */
  aiCaretBlink: 850,
} as const;

// --- Z-index layers for transient transition overlays ---
// --- 过渡层 z-index 层级 ---
export const ANIMATION_Z_INDEX = {
  /** Hold overlay: covers the App Router gap during navigation. / 保底遮罩：覆盖导航空窗期。 */
  transitionHold: 9998,
  /** Mask-reveal overlay: sits above the hold overlay for the radial cutout. / 遮罩揭示层：位于保底遮罩之上执行径向镂空。 */
  maskReveal: 9999,
} as const;

// --- Snapshot lifecycle ---
// --- 快照生命周期 ---
export const ANIMATION_SNAPSHOT = {
  /** Snapshots older than this are considered stale and ignored. / 超过此时间的快照视为过期并忽略。 */
  ttl: 3000,
} as const;

// --- Easing curves (as [x1, y1, x2, y2] cubic-bezier control points) ---
// --- 缓动曲线（[x1, y1, x2, y2] cubic-bezier 控制点） ---
export const ANIMATION_EASING = {
  /** Standard easing for general UI transitions. / 通用 UI 过渡标准缓动。 */
  standard: [0.25, 0.1, 0.25, 1.0] as [number, number, number, number],
  /** Reveal easing for mask-reveal and loading-release (soft, decelerating). / 遮罩揭示与加载释放的缓动（柔和减速）。 */
  reveal: [0.22, 0.61, 0.36, 1.0] as [number, number, number, number],
  /** Bounce easing for theme switch transforms (spring-like overshoot). / 主题切换 transform 的弹性缓动。 */
  themeBounce: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
} as const;

// --- Reduced-motion preference detection ---
// --- 减弱动画偏好检测 ---

/**
 * Check if the user prefers reduced motion. Safe to call on both server and
 * client (returns false on server). Memoized via a module-level cache to avoid
 * repeated matchMedia queries; listeners should use prefersReducedMotionSync
 * if they need to react to preference changes at runtime.
 * 检测用户是否偏好减弱动画。服务端和客户端均可安全调用（服务端返回 false）。
 * 通过模块级缓存避免重复 matchMedia 查询；如需运行时响应偏好变化，
 * 应使用 prefersReducedMotionSync。
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
