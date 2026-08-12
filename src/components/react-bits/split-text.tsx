// Accessible local adaptation of React Bits Split Text using the repository's
// existing Framer Motion dependency and the shared motion tokens.
// 使用仓库现有 Framer Motion 与统一动效 Token 的无障碍 Split Text 本地化实现。
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { MOTION_DURATION_MS, MOTION_EASING } from '@/runtime/motion/config';
import { useMotionPreferences } from '@/runtime/motion/provider';

interface SplitTextProps {
  className?: string;
  text: string;
  // The pulse variant starts visible and loops, making it safe for route snapshots.
  // pulse 变体从可见状态开始并循环播放，适合路由快照场景。
  variant?: 'pulse' | 'reveal';
}

export function SplitText({ className, text, variant = 'reveal' }: SplitTextProps) {
  const systemReducedMotion = useReducedMotion();
  const { effectiveLevel } = useMotionPreferences();
  const reduceMotion = systemReducedMotion || effectiveLevel === 'low';
  const characters = Array.from(text);
  const isPulse = variant === 'pulse';

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {characters.map((character, index) => (
          <motion.span
            className="rb-split-text__character"
            initial={
              reduceMotion ? false : isPulse ? { opacity: 0.58, y: 0 } : { opacity: 0, y: '0.55em' }
            }
            animate={
              isPulse && !reduceMotion
                ? { opacity: [0.58, 1, 0.58], y: [0, '-0.12em', 0] }
                : { opacity: 1, y: 0 }
            }
            transition={
              isPulse
                ? {
                    delay: reduceMotion ? 0 : (index * MOTION_DURATION_MS.splitStagger) / 1000,
                    duration: reduceMotion ? 0 : MOTION_DURATION_MS.particleMin / 1000,
                    ease: MOTION_EASING.standard,
                    repeat: reduceMotion ? 0 : Number.POSITIVE_INFINITY,
                  }
                : {
                    delay: reduceMotion
                      ? 0
                      : Math.min(
                          (index * MOTION_DURATION_MS.splitStagger) / 1000,
                          MOTION_DURATION_MS.splitStaggerLimit / 1000,
                        ),
                    duration: reduceMotion ? 0 : MOTION_DURATION_MS.splitGlyph / 1000,
                    ease: MOTION_EASING.standard,
                  }
            }
            // biome-ignore lint/suspicious/noArrayIndexKey: Glyph order is immutable and repeated letters need unique keys.
            key={index}
          >
            {character === ' ' ? '\u00a0' : character}
          </motion.span>
        ))}
      </span>
    </span>
  );
}
