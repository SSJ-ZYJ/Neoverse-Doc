// Hook: computes the largest scale at which the diagram fits inside the
// current canvas without overflow. Currently maintained as a computed ref
// for future zoom capping; callers may read fitCanvasScaleRef when needed.
// 自定义 Hook：计算图表在当前画布内不溢出的最大缩放。当前作为计算 ref
// 保留，供后续放大上限使用；调用方可在需要时读取 fitCanvasScaleRef。

'use client';

import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { MAX_SCALE } from './use-zoom-and-pan';

export function useFitCanvasScale(
  svgNatural: { width: number; height: number },
  canvasRef: RefObject<HTMLDivElement | null>,
  isMaximized: boolean,
) {
  const fitCanvasScaleRef = useRef(MAX_SCALE);

  const recomputeFitCanvasScale = useCallback(() => {
    const svgW = svgNatural.width;
    const svgH = svgNatural.height;
    if (svgW <= 0 || svgH <= 0) {
      fitCanvasScaleRef.current = MAX_SCALE;
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      fitCanvasScaleRef.current = MAX_SCALE;
      return;
    }
    const cs = window.getComputedStyle(canvas);
    const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const availW = canvas.clientWidth - padX;
    const availH = canvas.clientHeight - padY;
    if (availW <= 0 || availH <= 0) {
      fitCanvasScaleRef.current = MAX_SCALE;
      return;
    }
    fitCanvasScaleRef.current = Math.min(MAX_SCALE, availW / svgW, availH / svgH);
  }, [svgNatural.width, svgNatural.height, canvasRef]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: isMaximized intentionally drives recomputeFitCanvasScale so the cap re-derives when the canvas swaps between in-page and maximized layouts.
  useLayoutEffect(() => {
    recomputeFitCanvasScale();
  }, [recomputeFitCanvasScale, isMaximized]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', recomputeFitCanvasScale);
    return () => window.removeEventListener('resize', recomputeFitCanvasScale);
  }, [recomputeFitCanvasScale]);

  return fitCanvasScaleRef;
}
