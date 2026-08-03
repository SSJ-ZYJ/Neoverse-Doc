// Hook: computes the non-interactive base scale that keeps every Mermaid
// diagram inside the active canvas and viewport without changing the user's
// logical zoom level.
// 自定义 Hook：计算 Mermaid 图表在当前画布与视口内完整显示所需的非交互基础
// 比例，且不改变用户看到的逻辑缩放级别。

'use client';

import { type RefObject, useCallback, useEffect, useLayoutEffect, useState } from 'react';

// Leave a small block-axis gutter so a tall inline diagram and its frame can
// remain visible inside one browser viewport.
// 在块轴保留小幅安全间距，使纵向长图及其外框能在一个浏览器视口内完整显示。
const INLINE_VIEWPORT_GUTTER = 32;
const DEFAULT_FIT_SCALE = 1;
const SCALE_EPSILON = 0.0005;

export function useFitCanvasScale(
  svgNatural: { width: number; height: number },
  inPageCanvasRef: RefObject<HTMLDivElement | null>,
  maximizedCanvasRef: RefObject<HTMLDivElement | null>,
  isMaximized: boolean,
) {
  const [fitCanvasScale, setFitCanvasScale] = useState(DEFAULT_FIT_SCALE);

  const recomputeFitCanvasScale = useCallback(() => {
    const svgW = svgNatural.width;
    const svgH = svgNatural.height;
    if (svgW <= 0 || svgH <= 0) return DEFAULT_FIT_SCALE;

    // The in-page placeholder and the portaled maximized diagram coexist while
    // maximized. Separate refs prevent the portal unmount from clearing the
    // in-page canvas ref before the exit fit is measured.
    // 最大化期间页面占位图与 Portal 图会同时存在。拆分 ref 可避免 Portal
    // 卸载时清空页面画布引用，导致退出后的适配测量回退为 1。
    const canvas = isMaximized ? maximizedCanvasRef.current : inPageCanvasRef.current;
    if (!canvas) return DEFAULT_FIT_SCALE;

    const cs = window.getComputedStyle(canvas);
    const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const availW = canvas.clientWidth - padX;
    const viewportH = window.visualViewport?.height ?? window.innerHeight;
    const availH = isMaximized
      ? canvas.clientHeight - padY
      : viewportH - INLINE_VIEWPORT_GUTTER - padY;
    if (availW <= 0 || availH <= 0) return DEFAULT_FIT_SCALE;

    // The base scale never enlarges small diagrams. Oversized diagrams use the
    // stricter width/height ratio, so horizontal, vertical, and mixed Mermaid
    // formats stay fully visible at the logical 100% zoom level.
    // 基础比例不放大小图；超大图采用宽高约束中更严格的一项，使横向、纵向及
    // 混合 Mermaid 图型均能在逻辑 100% 缩放下完整显示。
    const nextScale = Math.min(DEFAULT_FIT_SCALE, availW / svgW, availH / svgH);
    setFitCanvasScale((currentScale) =>
      Math.abs(currentScale - nextScale) <= SCALE_EPSILON ? currentScale : nextScale,
    );
    return nextScale;
  }, [
    svgNatural.width,
    svgNatural.height,
    inPageCanvasRef,
    maximizedCanvasRef,
    isMaximized,
  ]);

  useLayoutEffect(() => {
    recomputeFitCanvasScale();
  }, [recomputeFitCanvasScale]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const canvas = isMaximized ? maximizedCanvasRef.current : inPageCanvasRef.current;
    const observer =
      canvas && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(recomputeFitCanvasScale)
        : null;
    if (canvas) observer?.observe(canvas);
    window.addEventListener('resize', recomputeFitCanvasScale);
    window.visualViewport?.addEventListener('resize', recomputeFitCanvasScale);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', recomputeFitCanvasScale);
      window.visualViewport?.removeEventListener('resize', recomputeFitCanvasScale);
    };
  }, [inPageCanvasRef, maximizedCanvasRef, isMaximized, recomputeFitCanvasScale]);

  return { fitCanvasScale, recomputeFitCanvasScale };
}
