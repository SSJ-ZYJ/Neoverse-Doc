// Shared framer-motion animation presets for consistent transitions across the app.
// framer-motion 动画预设，确保全站过渡效果一致。

export const docTransitionVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
} as const;

export const docTransitionTransition = {
  duration: 0.25,
  ease: 'easeOut' as const,
} as const;

export const maskRevealTransition = {
  duration: 0.8,
  ease: [0.76, 0.0, 0.24, 1.0] as [number, number, number, number],
} as const;

export const pageEnterVariants = {
  initial: { opacity: 0, scale: 0.98, filter: 'blur(10px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
} as const;

export const pageEnterTransition = {
  duration: 0.5,
  ease: 'easeOut' as const,
} as const;
