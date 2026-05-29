// Transition wrapper for doc-to-doc navigation: fades + slides the body
// content when the slug changes. Placed inside DocsBody in page.tsx so it
// does NOT break the CSS Grid relationship that DocsLayout relies on.
// 文档间切换过渡：slug 变化时对正文内容执行淡入 + 上移动画。
// 放在 page.tsx 的 DocsBody 内部，不会破坏 DocsLayout 依赖的 CSS Grid 关系。

'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { docTransitionVariants } from '@/lib/motion';

interface DocsTransitionProps {
  slugKey: string;
  children: ReactNode;
}

export function DocsTransition({ slugKey, children }: DocsTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={slugKey}
        variants={docTransitionVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
