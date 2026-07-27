// Hook: zoom and pan state for the Mermaid canvas.
// 自定义 Hook：管理 Mermaid 画布的缩放与平移状态。

'use client';

import { type PointerEvent as ReactPointerEvent, useCallback, useRef, useState } from 'react';

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 4;
export const SCALE_STEP = 0.25;
export const DEFAULT_SCALE = 1;
export const ORIGIN = { x: 0, y: 0 };

export interface PanOffset {
  x: number;
  y: number;
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

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
  }, []);

  // Reset accepts the active canvas fit instead of assuming 100%, so wide
  // mobile diagrams return to a fully visible inline size after maximize.
  // 重置接收当前画布适配比例，不再固定回到 100%，确保移动端宽图退出全屏后完整可见。
  const resetZoomTo = useCallback((targetScale: number) => {
    setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, targetScale)));
    setPan(ORIGIN);
  }, []);

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
    resetZoomTo,
    handlePointerDown,
    handlePointerMove,
    endDrag,
    canZoomOut,
    canZoomIn,
  };
}
