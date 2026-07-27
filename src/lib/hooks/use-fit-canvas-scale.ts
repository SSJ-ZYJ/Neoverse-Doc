// Hook: computes the largest scale at which the diagram fits inside the
// current canvas without overflow and applies it on initial inline render.
// 自定义 Hook：计算图表在当前画布内不溢出的最大缩放，并在行内初次渲染时应用。

'use client';

import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { MAX_SCALE } from './use-zoom-and-pan';

const INLINE_FIT_RATIO = 0.96;

export function useFitCanvasScale(
  svgNatural: { width: number; height: number },
  canvasRef: RefObject<HTMLDivElement | null>,
  isMaximized: boolean,
  setScale: Dispatch<SetStateAction<number>>,
) {
  const fitCanvasScaleRef = useRef(MAX_SCALE);
  const [fitCanvasScale, setFitCanvasScale] = useState(1);

  const recomputeFitCanvasScale = useCallback(() => {
    const svgW = svgNatural.width;
    const svgH = svgNatural.height;
    if (svgW <= 0 || svgH <= 0) {
      fitCanvasScaleRef.current = MAX_SCALE;
      return MAX_SCALE;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      fitCanvasScaleRef.current = MAX_SCALE;
      return MAX_SCALE;
    }
    const cs = window.getComputedStyle(canvas);
    const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const availW = canvas.clientWidth - padX;
    const availH = canvas.clientHeight - padY;
    if (availW <= 0 || availH <= 0) {
      fitCanvasScaleRef.current = MAX_SCALE;
      return MAX_SCALE;
    }
    fitCanvasScaleRef.current = Math.min(MAX_SCALE, (availW / svgW) * INLINE_FIT_RATIO);
    // Small diagrams keep their natural content size; only oversized diagrams
    // are reduced to the available reading width. This content-derived scale
    // becomes the stable frame used after initial render.
    // 小图保持内容自然尺寸，仅将超出阅读宽度的大图缩小；该内容适配比例随后锁定画布框。
    setFitCanvasScale(Math.min(1, fitCanvasScaleRef.current));
    return fitCanvasScaleRef.current;
  }, [svgNatural.width, svgNatural.height, canvasRef]);

  useLayoutEffect(() => {
    const fitScale = recomputeFitCanvasScale();
    if (!isMaximized) setScale(Math.min(1, fitScale));
  }, [recomputeFitCanvasScale, isMaximized, setScale]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', recomputeFitCanvasScale);
    return () => window.removeEventListener('resize', recomputeFitCanvasScale);
  }, [recomputeFitCanvasScale]);

  return fitCanvasScale;
}
