// Hook: viewport-maximize state for the Mermaid diagram.
// 自定义 Hook：管理 Mermaid 图表的视口内放大状态。

'use client';

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { DEFAULT_SCALE, ORIGIN, type PanOffset } from './use-zoom-and-pan';

export function useMermaidMaximize(
  scale: number,
  setScale: (scale: number) => void,
  pan: PanOffset,
  setPan: Dispatch<SetStateAction<PanOffset>>,
  initialScale = DEFAULT_SCALE,
) {
  const [isMaximized, setIsMaximized] = useState(false);
  const preMaximizeScaleRef = useRef(initialScale);
  const preMaximizePanRef = useRef<PanOffset>(ORIGIN);

  const toggleMaximize = useCallback(() => {
    setIsMaximized((m) => {
      if (m) {
        setScale(preMaximizeScaleRef.current);
        setPan(preMaximizePanRef.current);
      } else {
        preMaximizeScaleRef.current = scale;
        preMaximizePanRef.current = pan;
        // Maximized mode starts at logical 100%; useFitCanvasScale supplies the
        // physical width/height fit for its viewport-sized canvas.
        // 最大化模式从逻辑 100% 开始；物理宽高适配由 useFitCanvasScale
        // 针对视口画布单独提供。
        setScale(initialScale);
        setPan(ORIGIN);
      }
      return !m;
    });
  }, [scale, setScale, pan, setPan, initialScale]);

  useEffect(() => {
    if (!isMaximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setScale(preMaximizeScaleRef.current);
        setPan(preMaximizePanRef.current);
        setIsMaximized(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isMaximized, setScale, setPan]);

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
