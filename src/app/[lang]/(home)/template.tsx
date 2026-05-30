// Per-locale page transition wrapper powered by framer-motion.
// 按语言生效的页面过渡动效封装（基于 framer-motion）。
'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { pageEnterTransition, pageEnterVariants } from '@/lib/motion';

export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={pageEnterVariants}
      initial="initial"
      animate="animate"
      transition={pageEnterTransition}
      className="w-full h-full"
      style={{ willChange: 'transform, opacity, filter' }}
    >
      {children}
    </motion.div>
  );
}
