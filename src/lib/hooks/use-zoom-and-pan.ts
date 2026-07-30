// Hook: zoom and pan state for the Mermaid canvas.
// 自定义 Hook：管理 Mermaid 画布的缩放与平移状态。

'use client';

import { type PointerEvent as ReactPointerEvent, useCallback, useRef, useState } from 'react';

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 4;
export const SCALE_STEP = 0.25;
export const DEFAULT_SCALE = 1;
export const ORIGIN = { x: 0, y: 0 };

// Wheel zoom uses an exponential curve so mouse wheels and touchpads feel
// consistent. Delta normalization keeps line/page-mode devices from jumping,
// while the per-event cap prevents a single coarse wheel tick from skipping
// most of the available zoom range.
// 滚轮缩放使用指数曲线，使鼠标滚轮与触控板手感一致。Delta 归一化避免
// 行 / 页模式设备产生跳变，单事件限幅则防止粗粒度滚轮一次跨过大部分缩放范围。
const WHEEL_ZOOM_SENSITIVITY = 0.0015;
const WHEEL_DELTA_LIMIT = 240;
const WHEEL_LINE_HEIGHT = 16;
const SCALE_PRECISION = 4;

export interface PanOffset {
  x: number;
  y: number;
}

interface WheelZoomInput {
  clientX: number;
  clientY: number;
  deltaY: number;
  deltaMode: number;
  target: HTMLElement;
}

interface DragState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPanX: number;
  startPanY: number;
  moved: boolean;
}

export function useZoomAndPan(initialScale = DEFAULT_SCALE) {
  const [scale, setScale] = useState(initialScale);
  const [pan, setPan] = useState(ORIGIN);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<DragState | null>(null);
  const scaleRef = useRef(scale);
  const panRef = useRef(pan);

  // Wheel events can arrive faster than React commits state updates. Keep the
  // latest interaction targets in refs so every tick builds on the preceding
  // one instead of a stale render.
  // 滚轮事件可能快于 React 提交状态更新。用 ref 保存最新交互目标，使每次
  // 滚轮都基于前一次结果计算，而不是基于过期渲染。
  scaleRef.current = scale;
  panRef.current = pan;

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
  }, []);

  // Reset restores the logical 100% zoom. The separate fit scale keeps an
  // oversized diagram fully visible without leaking its physical ratio into
  // the toolbar percentage.
  // 重置恢复逻辑 100% 缩放；独立适配比例继续保证超大图完整可见，且不会把
  // 物理适配比例泄漏到工具栏百分比中。
  const resetZoom = useCallback(() => {
    scaleRef.current = DEFAULT_SCALE;
    panRef.current = ORIGIN;
    setScale(DEFAULT_SCALE);
    setPan(ORIGIN);
  }, []);

  // Zoom around the pointer by compensating the pan offset with the same scale
  // ratio. The point beneath the cursor therefore remains fixed in viewport
  // coordinates for both zoom-in and zoom-out.
  // 按指针位置缩放，并用相同比例补偿平移量，使光标下方的图表点在放大和
  // 缩小时都保持在同一视口坐标。
  const zoomAtPoint = useCallback(
    ({ clientX, clientY, deltaY, deltaMode, target }: WheelZoomInput) => {
      const pageHeight = target.ownerDocument.defaultView?.innerHeight ?? target.clientHeight;
      const deltaMultiplier =
        deltaMode === WheelEvent.DOM_DELTA_LINE
          ? WHEEL_LINE_HEIGHT
          : deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? pageHeight
            : 1;
      const normalizedDelta = Math.max(
        -WHEEL_DELTA_LIMIT,
        Math.min(WHEEL_DELTA_LIMIT, deltaY * deltaMultiplier),
      );
      const currentScale = scaleRef.current;
      const nextScale = Math.max(
        MIN_SCALE,
        Math.min(
          MAX_SCALE,
          +(currentScale * Math.exp(-normalizedDelta * WHEEL_ZOOM_SENSITIVITY)).toFixed(
            SCALE_PRECISION,
          ),
        ),
      );
      if (nextScale === currentScale) return;

      const targetRect = target.getBoundingClientRect();
      const currentPan = panRef.current;
      const scaleRatio = nextScale / currentScale;
      const nextPan = {
        x: currentPan.x + (1 - scaleRatio) * (clientX - (targetRect.left + targetRect.width / 2)),
        y: currentPan.y + (1 - scaleRatio) * (clientY - (targetRect.top + targetRect.height / 2)),
      };

      scaleRef.current = nextScale;
      panRef.current = nextPan;
      setScale(nextScale);
      setPan(nextPan);
    },
    [],
  );

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const target = e.currentTarget;
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // Capture may fail for non-primary pointers; drag still works while inside the wrapper.
      }
      dragStateRef.current = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y,
        moved: false,
      };
      setIsDragging(true);
    },
    [pan],
  );

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    const deltaX = e.clientX - state.startClientX;
    const deltaY = e.clientY - state.startClientY;
    if (deltaX === 0 && deltaY === 0) return;
    state.moved = true;
    setPan({ x: state.startPanX + deltaX, y: state.startPanY + deltaY });
  }, []);

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Capture may already be released by the browser.
    }
    dragStateRef.current = null;
    setIsDragging(false);
  }, []);

  const canZoomOut = scale > MIN_SCALE;
  const canZoomIn = scale < MAX_SCALE;
  return {
    scale,
    setScale,
    pan,
    setPan,
    isDragging,
    zoomIn,
    zoomOut,
    zoomAtPoint,
    resetZoom,
    handlePointerDown,
    handlePointerMove,
    endDrag,
    canZoomOut,
    canZoomIn,
  };
}
