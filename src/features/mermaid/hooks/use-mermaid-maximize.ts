// Hook: viewport-maximize state for the Mermaid diagram.
// 自定义 Hook：管理 Mermaid 图表的视口内放大状态。

'use client';

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useLayoutEffect,
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

  const maximize = useCallback(() => {
    setIsMaximized((current) => {
      if (current) return current;

      preMaximizeScaleRef.current = scale;
      preMaximizePanRef.current = pan;
      // Maximized mode starts at logical 100%; useFitCanvasScale supplies the
      // physical width/height fit for its viewport-sized canvas.
      // 最大化模式从逻辑 100% 开始；物理宽高适配由 useFitCanvasScale
      // 针对视口画布单独提供。
      setScale(initialScale);
      setPan(ORIGIN);
      return true;
    });
  }, [scale, setScale, pan, setPan, initialScale]);

  const restore = useCallback(() => {
    setIsMaximized((current) => {
      if (!current) return current;

      setScale(preMaximizeScaleRef.current);
      setPan(preMaximizePanRef.current);
      return false;
    });
  }, [setScale, setPan]);

  useLayoutEffect(() => {
    if (!isMaximized) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMaximized]);

  // Keep the hidden in-page renderer frozen at the exact logical viewport it
  // had before maximizing. The portaled renderer can then reset and change its
  // own scale / pan without mutating the placeholder that will be revealed on
  // restore.
  // 隐藏的页面内渲染器始终保留进入全屏前的逻辑视口；Portal 渲染器可以独立
  // 重置和修改缩放 / 平移，不会改动退出时重新显示的原位占位图。
  const inPageScale = isMaximized ? preMaximizeScaleRef.current : scale;
  const inPagePan = isMaximized ? preMaximizePanRef.current : pan;

  return { isMaximized, inPageScale, inPagePan, maximize, restore };
}
