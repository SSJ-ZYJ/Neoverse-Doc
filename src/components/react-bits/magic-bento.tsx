// Local adaptation of React Bits Magic Bento and Border Glow. It keeps only
// cursor-positioned edge light and a subtle surface spot, with static fallback.
// React Bits Magic Bento 与 Border Glow 的本地化改造：仅保留边缘光与轻微光斑，并提供静态降级。
'use client';

import { type PointerEvent, type ReactNode, useEffect, useRef } from 'react';

interface MagicBentoProps {
  children: ReactNode;
  className?: string;
}

export function MagicBento({ children, className = '' }: MagicBentoProps) {
  const frameRef = useRef<number | null>(null);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (
      event.pointerType !== 'mouse' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const card = (event.target as Element).closest<HTMLElement>('[data-bento-card]');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      card.style.setProperty('--bento-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--bento-y', `${event.clientY - rect.top}px`);
    });
  };

  // Cancel any pending RAF frame when the component unmounts. Pointer events
  // stop firing after unmount, but a frame scheduled just before navigation
  // could otherwise fire on a detached node.
  // 组件卸载时取消待处理的 RAF 帧。卸载后 pointer 事件不再触发，
  // 但导航前刚调度的帧可能在不存在的节点上执行。
  useEffect(() => {
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div className={`rb-magic-bento ${className}`} onPointerMove={handlePointerMove}>
      {children}
    </div>
  );
}
