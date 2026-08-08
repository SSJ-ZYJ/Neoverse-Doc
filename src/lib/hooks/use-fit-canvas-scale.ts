// Hook: computes the non-interactive base scale that keeps the diagram inside
// the active canvas and viewport. The scheduler supplies the normalized SVG
// dimensions before DOM injection, avoiding a query + viewBox read + secondary
// natural-size state update on the first visible frame. Canvas padding is
// cached before the SVG arrives so normal diagrams do not force a style read
// while their large SVG subtree is being committed.
// 自定义 Hook：计算使图表完整显示在活动画布与视口内所需的非交互基础比例。
// 调度器会在 DOM 注入前提供已归一化的 SVG 尺寸，避免首个可见帧再查询 DOM、
// 读取 viewBox 并二次更新自然尺寸状态。canvas padding 在 SVG 到达前缓存，
// 普通图表提交大型 SVG 子树时无需强制读取样式。

'use client';

import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// Leave a small block-axis gutter so a tall inline diagram and its frame can
// remain visible inside one browser viewport.
// 在块轴保留小幅安全间距，使纵向长图及其外框能在一个浏览器视口内完整显示。
const INLINE_VIEWPORT_GUTTER = 32;
const DEFAULT_FIT_SCALE = 1;
const SCALE_EPSILON = 0.0005;

export function useFitCanvasScale(
  svgNatural: { width: number; height: number },
  diagramType: string | null,
  inPageCanvasRef: RefObject<HTMLDivElement | null>,
  maximizedCanvasRef: RefObject<HTMLDivElement | null>,
  isMaximized: boolean,
) {
  const [inPageFitCanvasScale, setInPageFitCanvasScale] = useState(DEFAULT_FIT_SCALE);
  const [maximizedFitCanvasScale, setMaximizedFitCanvasScale] = useState(DEFAULT_FIT_SCALE);

  // Keep a ref so the resize handler reads the latest svgNatural without
  // depending on it in its deps — the ResizeObserver is not recreated when
  // the SVG changes.
  // 用 ref 让 resize 处理器读取最新 svgNatural 而不将其列入依赖 ——
  // SVG 变化时 ResizeObserver 不会被重建。
  const svgNaturalRef = useRef(svgNatural);
  svgNaturalRef.current = svgNatural;

  // Cached canvas padding. Read once when the canvas ref mounts and refreshed
  // only when Gantt / Git Graph switches to its symmetric padding variant.
  // 缓存的 canvas padding。canvas ref 挂载时读一次，仅在甘特图 / Git Graph
  // 切换到对称 padding 变体时刷新。
  const paddingRef = useRef({ x: 0, y: 0 });

  const refreshPadding = useCallback(() => {
    const canvas = isMaximized ? maximizedCanvasRef.current : inPageCanvasRef.current;
    if (!canvas) return;
    const cs = window.getComputedStyle(canvas);
    paddingRef.current = {
      x: (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0),
      y: (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0),
    };
  }, [inPageCanvasRef, maximizedCanvasRef, isMaximized]);

  const recomputeFitCanvasScale = useCallback(() => {
    const svgW = svgNaturalRef.current.width;
    const svgH = svgNaturalRef.current.height;
    if (svgW <= 0 || svgH <= 0) return DEFAULT_FIT_SCALE;

    // The in-page placeholder and the portaled maximized diagram coexist while
    // maximized. Separate refs prevent the portal unmount from clearing the
    // in-page canvas ref before the exit fit is measured.
    // 最大化期间页面占位图与 Portal 图会同时存在。拆分 ref 可避免 Portal
    // 卸载时清空页面画布引用，导致退出后的适配测量回退为 1。
    const canvas = isMaximized ? maximizedCanvasRef.current : inPageCanvasRef.current;
    if (!canvas) return DEFAULT_FIT_SCALE;

    const { x: padX, y: padY } = paddingRef.current;
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
    const setActiveFitCanvasScale = isMaximized
      ? setMaximizedFitCanvasScale
      : setInPageFitCanvasScale;
    setActiveFitCanvasScale((currentScale) =>
      Math.abs(currentScale - nextScale) <= SCALE_EPSILON ? currentScale : nextScale,
    );
    return nextScale;
  }, [inPageCanvasRef, maximizedCanvasRef, isMaximized]);

  // Read padding once when the canvas ref mounts. This happens before any SVG
  // is injected, so getComputedStyle carries no style-recalc penalty.
  // canvas ref 挂载时读一次 padding。此时 SVG 尚未注入，
  // getComputedStyle 不带样式重算开销。
  useLayoutEffect(() => {
    refreshPadding();
  }, [refreshPadding]);

  // Calculate against scheduler-provided dimensions. No SVG DOM traversal or
  // computed-style read occurs in the injection frame. Only the two diagram
  // types with alternate padding need a next-frame padding refresh.
  // 使用调度器提供的尺寸计算。SVG 注入帧不遍历其 DOM，也不读取计算样式；
  // 只有两种使用特殊 padding 的图型需要在下一帧刷新 padding。
  useLayoutEffect(() => {
    if (svgNatural.width <= 0 || svgNatural.height <= 0) {
      const setActiveFitCanvasScale = isMaximized
        ? setMaximizedFitCanvasScale
        : setInPageFitCanvasScale;
      setActiveFitCanvasScale(DEFAULT_FIT_SCALE);
      const canvas = isMaximized ? maximizedCanvasRef.current : inPageCanvasRef.current;
      if (canvas) delete canvas.dataset.mermaidType;
      return;
    }

    const canvas = isMaximized ? maximizedCanvasRef.current : inPageCanvasRef.current;
    if (!canvas) return;

    if (diagramType) {
      canvas.dataset.mermaidType = diagramType;
    } else {
      delete canvas.dataset.mermaidType;
    }

    // Calculate fit immediately with cached metrics; only the scale can require
    // a pre-paint correction because natural dimensions are already committed
    // together with the SVG.
    // 立即用缓存指标计算适配比例；自然尺寸已与 SVG 同次提交，绘制前最多只需
    // 修正比例。
    const { x: padX, y: padY } = paddingRef.current;
    const availW = canvas.clientWidth - padX;
    const viewportH = window.visualViewport?.height ?? window.innerHeight;
    const availH = isMaximized
      ? canvas.clientHeight - padY
      : viewportH - INLINE_VIEWPORT_GUTTER - padY;
    if (availW <= 0 || availH <= 0) return;

    const nextScale = Math.min(
      DEFAULT_FIT_SCALE,
      availW / svgNatural.width,
      availH / svgNatural.height,
    );
    const setActiveFitCanvasScale = isMaximized
      ? setMaximizedFitCanvasScale
      : setInPageFitCanvasScale;
    setActiveFitCanvasScale((currentScale) =>
      Math.abs(currentScale - nextScale) <= SCALE_EPSILON ? currentScale : nextScale,
    );

    if (diagramType !== 'gantt' && diagramType !== 'gitGraph') return;

    // These two diagram types change padding through data-mermaid-type. Refresh
    // after the browser has applied that selector, then correct the fit scale.
    // 这两种图型会通过 data-mermaid-type 改变 padding；待浏览器应用选择器后
    // 刷新并修正适配比例。
    const raf = requestAnimationFrame(() => {
      refreshPadding();
      recomputeFitCanvasScale();
    });
    return () => cancelAnimationFrame(raf);
  }, [
    svgNatural.width,
    svgNatural.height,
    diagramType,
    isMaximized,
    inPageCanvasRef,
    maximizedCanvasRef,
    refreshPadding,
    recomputeFitCanvasScale,
  ]);

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

  return {
    inPageFitCanvasScale,
    maximizedFitCanvasScale,
    recomputeFitCanvasScale,
  };
}
