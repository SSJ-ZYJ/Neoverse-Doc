// Hook: zoom and pan state for the Mermaid canvas.
// Supports wheel zoom, single-pointer drag pan, and two-pointer pinch-to-zoom.
// 自定义 Hook：管理 Mermaid 画布的缩放与平移状态。
// 支持滚轮缩放、单指拖动平移与双指捏合缩放。

'use client';

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useRef,
  useState,
} from 'react';

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
  // Cached zoom-target element for direct DOM updates during drag.
  // Bypassing React re-renders eliminates per-frame reconciliation overhead.
  // 缓存的缩放目标元素，用于拖动期间直接更新 DOM。
  // 绕过 React 重渲染，消除每帧协调开销。
  zoomTarget: HTMLElement | null;
}

// Pinch gesture state: captured when a second pointer goes down.
//双指缩放状态：第二根手指按下时捕获。
interface PinchState {
  startDistance: number;
  startScale: number;
  target: HTMLElement;
}

export function useZoomAndPan(initialScale = DEFAULT_SCALE) {
  const [scale, setScale] = useState(initialScale);
  const [pan, setPan] = useState(ORIGIN);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<DragState | null>(null);
  const scaleRef = useRef(scale);
  const panRef = useRef(pan);

  // Active pointers for multi-touch gesture tracking.
  // 跟踪活动指针以支持多触摸手势。
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStateRef = useRef<PinchState | null>(null);

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

  // Core zoom-at-point logic: computes the next pan offset so the point
  // beneath (clientX, clientY) remains fixed in viewport coordinates.
  // Shared by wheel zoom and pinch-to-zoom.
  // 按点缩放核心逻辑：计算下一个平移偏移，使 (clientX, clientY) 下方的点
  // 在视口坐标中保持固定。滚轮缩放与双指缩放共用此逻辑。
  const applyZoomAtPoint = useCallback(
    (clientX: number, clientY: number, nextScale: number, target: HTMLElement) => {
      const currentScale = scaleRef.current;
      const clampedScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, +nextScale.toFixed(SCALE_PRECISION)),
      );
      if (clampedScale === currentScale) return;

      const targetRect = target.getBoundingClientRect();
      const currentPan = panRef.current;
      const scaleRatio = clampedScale / currentScale;
      const nextPan = {
        x: currentPan.x + (1 - scaleRatio) * (clientX - (targetRect.left + targetRect.width / 2)),
        y: currentPan.y + (1 - scaleRatio) * (clientY - (targetRect.top + targetRect.height / 2)),
      };

      scaleRef.current = clampedScale;
      panRef.current = nextPan;
      setScale(clampedScale);
      setPan(nextPan);
    },
    [],
  );

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
      const nextScale = currentScale * Math.exp(-normalizedDelta * WHEEL_ZOOM_SENSITIVITY);
      applyZoomAtPoint(clientX, clientY, nextScale, target);
    },
    [applyZoomAtPoint],
  );

  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // Capture may fail for non-primary pointers; drag still works while inside the wrapper.
    }

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Second pointer initiates pinch-to-zoom; cancel any ongoing drag.
    // 第二根手指触发双指缩放；取消正在进行的拖动。
    if (pointersRef.current.size === 2) {
      const points = [...pointersRef.current.values()];
      const zoomTarget = target.querySelector<HTMLElement>('.mermaid-zoom-target');
      if (zoomTarget) {
        // Sync any unsaved pan from the cancelled drag to React state so the
        // pinch starts from the correct position.
        // 将取消的拖动中未保存的平移同步到 React 状态，使双指缩放从正确位置开始。
        if (dragStateRef.current?.moved) {
          setPan(panRef.current);
        }
        pinchStateRef.current = {
          startDistance: Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y),
          startScale: scaleRef.current,
          target: zoomTarget,
        };
        dragStateRef.current = null;
      }
      return;
    }

    // Immediately mark the canvas as dragging via direct DOM manipulation to
    // disable CSS transitions before React commits the state update. This
    // prevents first-frame transition lag on the initial pointermove.
    // 通过直接 DOM 操作立即标记画布为拖动态，在 React 提交状态更新前
    // 禁用 CSS 过渡，避免首次 pointermove 的首帧过渡延迟。
    target.dataset.dragging = '';
    // Cache the zoom-target element for direct DOM updates during drag.
    // This bypasses React re-renders, eliminating per-frame reconciliation.
    // 缓存缩放目标元素用于拖动期间直接 DOM 更新，绕过 React 重渲染。
    const zoomTarget = target.querySelector<HTMLElement>('.mermaid-zoom-target');
    dragStateRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanX: panRef.current.x,
      startPanY: panRef.current.y,
      moved: false,
      zoomTarget,
    };
    setIsDragging(true);
  }, []);

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      // Pinch-to-zoom: compute scale from distance ratio, zoom around midpoint.
      // 双指缩放：按距离比计算比例，围绕两指中点缩放。
      if (pointersRef.current.size >= 2 && pinchStateRef.current) {
        const points = [...pointersRef.current.values()];
        const currentDistance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
        const ratio = currentDistance / pinchStateRef.current.startDistance;
        const nextScale = pinchStateRef.current.startScale * ratio;
        const midX = (points[0].x + points[1].x) / 2;
        const midY = (points[0].y + points[1].y) / 2;
        applyZoomAtPoint(midX, midY, nextScale, pinchStateRef.current.target);
        return;
      }

      // Single-pointer drag: pan the diagram.
      // 单指拖动：平移图表。
      const state = dragStateRef.current;
      if (!state || state.pointerId !== e.pointerId) return;
      const deltaX = e.clientX - state.startClientX;
      const deltaY = e.clientY - state.startClientY;
      if (deltaX === 0 && deltaY === 0) return;
      state.moved = true;

      const nextPan = { x: state.startPanX + deltaX, y: state.startPanY + deltaY };
      panRef.current = nextPan;

      // Direct DOM update: set CSS variables on the zoom-target element to
      // update the pan transform without triggering a React re-render. This
      // eliminates per-frame React reconciliation (hook re-execution, style
      // object creation, virtual DOM diffing, commit) during drag, which is
      // the main bottleneck on complex diagrams with many SVG nodes.
      // panRef is updated immediately so concurrent zoom operations see the
      // latest value. React state is synced once when drag ends.
      // 直接 DOM 更新：在缩放目标元素上设置 CSS 变量以更新平移 transform，
      // 无需触发 React 重渲染。这消除了拖动期间每帧的 React 协调开销
      //（hook 重新执行、样式对象创建、虚拟 DOM diff、提交），这是含大量
      // SVG 节点的复杂图上的主要瓶颈。panRef 立即更新使并发缩放操作能
      // 看到最新值；React 状态在拖动结束时同步一次。
      const el = state.zoomTarget;
      if (el) {
        el.style.setProperty('--mermaid-pan-x', `${nextPan.x}px`);
        el.style.setProperty('--mermaid-pan-y', `${nextPan.y}px`);
      }
    },
    [applyZoomAtPoint],
  );

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Capture may already be released by the browser.
    }

    // End pinch gesture when fewer than two pointers remain.
    // 剩余指针不足两个时结束双指缩放。
    if (pinchStateRef.current && pointersRef.current.size < 2) {
      pinchStateRef.current = null;
    }

    // End drag when the drag pointer is released.
    // 拖动指针释放时结束拖动。
    if (dragStateRef.current && dragStateRef.current.pointerId === e.pointerId) {
      const state = dragStateRef.current;
      dragStateRef.current = null;

      // Sync the final pan position to React state. During drag, pan was
      // updated directly on the DOM via CSS variables for smoother rendering;
      // this single setPan call aligns React state with the DOM after drag
      // ends so subsequent operations (zoom, reset, re-render) use the
      // correct position.
      // 将最终平移位置同步到 React 状态。拖动期间平移已通过 CSS 变量直接
      // 更新到 DOM 以获得更流畅的渲染；此 setPan 调用在拖动结束后将
      // React 状态与 DOM 对齐，使后续操作（缩放、重置、重渲染）使用正确位置。
      if (state.moved) {
        setPan(panRef.current);
      }
    }

    // When all pointers are released, clear the dragging state.
    // 所有指针释放时清除拖动态。
    if (pointersRef.current.size === 0) {
      delete e.currentTarget.dataset.dragging;
      setIsDragging(false);
    }
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
