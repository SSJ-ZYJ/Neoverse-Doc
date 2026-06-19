// Hook: viewport-maximize state for the Mermaid diagram.
// 自定义 Hook：管理 Mermaid 图表的视口内放大状态。

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_SCALE, MAX_SCALE } from './use-zoom-and-pan';

const VIEWPORT_FIT_PADDING = 48;
const VIEWPORT_FIT_TOOLBAR_GAP = 72;

export function useMermaidMaximize(
  scale: number,
  setScale: (scale: number) => void,
  svgNatural: { width: number; height: number },
  initialScale = DEFAULT_SCALE,
) {
  const [isMaximized, setIsMaximized] = useState(false);
  const preMaximizeScaleRef = useRef(initialScale);

  const computeFitViewportScale = useCallback((): number => {
    const svgW = svgNatural.width;
    const svgH = svgNatural.height;
    if (svgW <= 0 || svgH <= 0) return initialScale;
    if (typeof window === 'undefined') return initialScale;
    const availW = window.innerWidth - VIEWPORT_FIT_PADDING;
    const availH = window.innerHeight - VIEWPORT_FIT_PADDING - VIEWPORT_FIT_TOOLBAR_GAP;
    if (availW <= 0 || availH <= 0) return initialScale;
    return Math.min(availW / svgW, availH / svgH, MAX_SCALE);
  }, [svgNatural.width, svgNatural.height, initialScale]);

  const toggleMaximize = useCallback(() => {
    setIsMaximized((m) => {
      if (m) {
        setScale(preMaximizeScaleRef.current);
      } else {
        preMaximizeScaleRef.current = scale;
        const fitViewport = computeFitViewportScale();
        setScale(Math.max(scale, fitViewport));
      }
      return !m;
    });
  }, [scale, setScale, computeFitViewportScale]);

  useEffect(() => {
    if (!isMaximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setScale(preMaximizeScaleRef.current);
        setIsMaximized(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isMaximized, setScale]);

  useEffect(() => {
    if (!isMaximized) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMaximized]);

  return { isMaximized, toggleMaximize };
}
