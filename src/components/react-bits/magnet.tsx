// Pointer-only local adaptation of React Bits Magnet. DOM transforms are
// updated through requestAnimationFrame, avoiding high-frequency React state.
// 仅指针设备启用的 Magnet 本地化实现；通过 RAF 直接更新 DOM，避免高频 React 状态。
'use client';

import { type PointerEvent, type ReactNode, useEffect, useRef } from 'react';

interface MagnetProps {
  children: ReactNode;
  className?: string;
}

export function Magnet({ children, className = '' }: MagnetProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);

  const reset = () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      rootRef.current?.style.setProperty('transform', 'translate3d(0, 0, 0)');
    });
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (
      event.pointerType !== 'mouse' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - (rect.left + rect.width / 2)) * 0.12;
    const y = (event.clientY - (rect.top + rect.height / 2)) * 0.12;
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      rootRef.current?.style.setProperty('transform', `translate3d(${x}px, ${y}px, 0)`);
    });
  };

  useEffect(
    () => () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  return (
    <div
      className={`rb-magnet ${className}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      ref={rootRef}
    >
      {children}
    </div>
  );
}
