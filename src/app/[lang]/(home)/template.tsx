// Per-locale page transition wrapper powered by framer-motion.
// 按语言生效的页面过渡动效封装（基于 framer-motion）。
'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { pageEnterTransition, pageEnterVariants } from '@/lib/motion';
import { releaseRouteLoadingHandoff } from '@/lib/route-loading-handoff';
import { isCrossRouteGroupTransition, readTransitionSnapshot } from '@/lib/transition-snapshot';

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Only skip the entry animation when arriving via a cross-route-group
  // mask-reveal transition (e.g., docs → home). Within-group transitions
  // (e.g., guestbook → home via BackLink) have a snapshot but should still
  // play page-enter, not mask-reveal.
  // 仅在通过跨路由组遮罩揭示过渡到达时（如文档 → 首页）跳过入场动画。
  // 同路由组切换（如通过 BackLink 从留言板返回首页）虽有快照，但仍应播放
  // page-enter，而非 mask-reveal。
  const [skipEntry] = useState(() => {
    const snapshot = readTransitionSnapshot();
    if (!snapshot) return false;
    return isCrossRouteGroupTransition(snapshot.sourcePath, pathname);
  });

  // Release the cloned root loading screen after the home route has mounted,
  // smoothing the first "/" → "/{locale}" handoff.
  // 首页路由挂载后释放克隆的根加载画面，平滑 "/" → "/{locale}" 的首次交接。
  useEffect(() => {
    releaseRouteLoadingHandoff();
  }, []);

  return (
    <motion.div
      variants={pageEnterVariants}
      // Skip the initial frame only during a mask-reveal transition to avoid
      // the body background flashing through the transparent cutout area.
      // 仅在遮罩揭示过渡期间跳过首帧，避免 body 背景透过透明镂空区闪烁。
      initial={skipEntry ? false : 'initial'}
      animate="animate"
      transition={pageEnterTransition}
      className="w-full h-full"
      style={{ willChange: 'transform, opacity, filter' }}
    >
      {children}
    </motion.div>
  );
}
