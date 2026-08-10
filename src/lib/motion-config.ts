// Shared JavaScript motion configuration mirrors the semantic CSS duration
// tokens and keeps route, particle, and component timing in one place.
// JavaScript 动效配置与语义化 CSS 时长 Token 对齐，集中管理转场、粒子与组件节奏。

export const MOTION_DURATION_MS = {
  instant: 0,
  fast: 260,
  standard: 520,
  expressive: 1100,
  aperture: 1200,
  overview: 560,
  surface: 480,
  content: 1400,
  contentEnterDelay: 700,
  contentEnter: 360,
  crossfade: 420,
  loadingRelease: 480,
  theme: 480,
  aiCaretBlink: 1200,
  splitGlyph: 680,
  splitStagger: 45,
  splitStaggerLimit: 650,
  particleMin: 1500,
  particleMax: 2300,
  particleField: 2800,
} as const;

export const MOTION_EASING = {
  standard: [0.22, 1, 0.36, 1] as [number, number, number, number],
  reveal: [0.16, 1, 0.3, 1] as [number, number, number, number],
  softSpring: [0.2, 0.8, 0.2, 1] as [number, number, number, number],
} as const;

// Shared frame-rate budgets keep continuous ambient motion smooth without
// coupling GPU work to high-refresh display rates.
// 共享帧率预算在保持环境动效流畅的同时，避免 GPU 开销随高刷屏刷新率增长。
export const MOTION_FRAME_RATE = {
  homepageAmbient: 60,
} as const;

export const TRANSITION_DURATION_MS = {
  aperture: MOTION_DURATION_MS.aperture,
  overview: MOTION_DURATION_MS.overview,
  surface: MOTION_DURATION_MS.surface,
  content: MOTION_DURATION_MS.content,
  crossfade: MOTION_DURATION_MS.crossfade,
} as const;

export const TRANSITION_TIMEOUT_MS = {
  navigation: 8_000,
  settleBuffer: 140,
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
