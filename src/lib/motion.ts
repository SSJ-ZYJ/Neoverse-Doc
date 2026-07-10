// Shared framer-motion animation presets for consistent transitions across the app.
// Durations and easing curves reference the centralized animation-constants
// so JS and CSS stay in sync.
// framer-motion 动画预设，确保全站过渡效果一致。
// 时长与缓动曲线引用集中的 animation-constants，保持 JS 与 CSS 同步。

import { ANIMATION_DURATION, ANIMATION_EASING } from '@/lib/animation-constants';

// Optimized mask reveal: feathered radial cutout from click point outward.
// 优化后的遮罩揭示：从点击位置向外羽化径向镂空。
export const maskRevealTransition = {
  duration: ANIMATION_DURATION.maskReveal / 1000,
  ease: ANIMATION_EASING.reveal,
} as const;
