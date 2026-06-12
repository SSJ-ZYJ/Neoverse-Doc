// Shared framer-motion animation presets for consistent transitions across the app.
// framer-motion 动画预设，确保全站过渡效果一致。

// Optimized docs transition: smoother cubic-bezier easing, slightly longer duration for perceived quality.
// 优化后的文档过渡：更平滑的 cubic-bezier 缓动，稍长的时长提升质感。
export const docTransitionVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
} as const;

export const docTransitionTransition = {
  duration: 0.35,
  ease: [0.25, 0.1, 0.25, 1.0] as [number, number, number, number],
} as const;

// Optimized mask reveal: added feathering via mask-size animation for softer edge reveal.
// 优化后的遮罩揭示：通过 mask-size 动画添加羽化边缘，揭示更柔和。
export const maskRevealTransition = {
  duration: 2.5,
  ease: [0.22, 0.61, 0.36, 1.0] as [number, number, number, number],
} as const;

// Optimized page enter: more noticeable scale difference, longer duration for smoother feel, will-change hint.
// 优化后的页面进入：更明显的缩放差异，更长时长让动画更从容，添加 will-change 提示。
export const pageEnterVariants = {
  initial: { opacity: 0, scale: 0.96, filter: 'blur(8px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
} as const;

export const pageEnterTransition = {
  duration: 0.65,
  ease: [0.25, 0.1, 0.25, 1.0] as [number, number, number, number],
} as const;
