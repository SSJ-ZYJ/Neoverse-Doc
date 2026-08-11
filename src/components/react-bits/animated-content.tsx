// Local adaptation of React Bits Animated Content. One observer reveals a
// whole content group, avoiding a separate complex timeline for every item.
// React Bits Animated Content 的本地化实现：整组内容共用一次观察与入场。
'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/motion-preferences';

interface AnimatedContentProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedContent({ children, className = '' }: AnimatedContentProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    if (prefersReducedMotion()) {
      node.dataset.visible = 'true';
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        node.dataset.visible = 'true';
        observer.disconnect();
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={className} data-animated-content ref={rootRef}>
      {children}
    </div>
  );
}
