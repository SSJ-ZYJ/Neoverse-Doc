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
import { DEFAULT_SCALE, MAX_SCALE, ORIGIN, type PanOffset } from './use-zoom-and-pan';

const VIEWPORT_FIT_PADDING = 48;
// Toolbar zone reserved at viewport bottom. Combined with VIEWPORT_FIT_PADDING,
// availH = innerHeight - 48 - 64 = innerHeight - 112, matching the canvas
// content-box height (100vh - 1.5rem top padding - 4rem bottom padding =
// 100vh - 5.5rem = 100vh - 88px ≈ innerHeight - 88px). The 4rem bottom
// padding clears the floating toolbar (which sits at bottom: 1rem with
// ~2.4rem height). Using fitViewport directly (not max(scale, fitViewport))
// ensures the whole diagram fits in one screen with toolbar space reserved.
// 视口底部为工具栏保留的区域。与 VIEWPORT_FIT_PADDING 一起，
// availH = innerHeight - 48 - 64 = innerHeight - 112，与 canvas
// content-box 高度匹配（100vh - 1.5rem 顶部 padding - 4rem 底部 padding =
// 100vh - 5.5rem = 100vh - 88px ≈ innerHeight - 88px）。4rem 底部 padding
// 避让悬浮工具栏（位于 bottom: 1rem，高约 2.4rem）。直接使用 fitViewport
// （不取 max(scale, fitViewport)）确保整个图表在一屏内可见并预留工具栏空间。
const VIEWPORT_FIT_TOOLBAR_GAP = 64;

export function useMermaidMaximize(
  scale: number,
  setScale: (scale: number) => void,
  pan: PanOffset,
  setPan: Dispatch<SetStateAction<PanOffset>>,
  svgNatural: { width: number; height: number },
  initialScale = DEFAULT_SCALE,
) {
  const [isMaximized, setIsMaximized] = useState(false);
  const preMaximizeScaleRef = useRef(initialScale);
  const preMaximizePanRef = useRef<PanOffset>(ORIGIN);

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
        setPan(preMaximizePanRef.current);
      } else {
        preMaximizeScaleRef.current = scale;
        preMaximizePanRef.current = pan;
        const fitViewport = computeFitViewportScale();
        setScale(fitViewport);
        setPan(ORIGIN);
      }
      return !m;
    });
  }, [scale, setScale, pan, setPan, computeFitViewportScale]);

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
