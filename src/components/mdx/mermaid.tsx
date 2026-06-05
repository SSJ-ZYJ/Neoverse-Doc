// Mermaid diagram renderer with zoom / pan / reset / fullscreen controls.
// Initializes mermaid on mount and re-renders whenever the chart source or
// theme changes. Falls back to raw text on error.
// Mermaid 图表渲染器（带缩放 / 拖动 / 重置 / 全屏控制）。挂载时初始化
// mermaid，当图表源码或主题变化时重新渲染。出错时回退为原始文本。

'use client';

import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { Maximize, Minimize, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import mermaid from 'mermaid';
import { useTheme } from 'next-themes';
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { en } from '@/dictionaries/en';
import { zh } from '@/dictionaries/zh';

// Locale → mermaid toolbar labels lookup. Falls back to the default language
// so unlisted locales still render sensible defaults.
// 按 locale 查表获取工具栏文案，未列出的语言回退到默认语言。
const MERMAID_LABELS = { zh, en } as const;
const DEFAULT_LOCALE = 'zh';

let counter = 0;

// Zoom limits / 缩放范围
const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const SCALE_STEP = 0.25;

// Pan origin. The zoom target starts centered; we keep this as a const so the
// reset logic and initial state stay in sync.
// 平移原点。缩放目标初始居中；用常量保持与重置逻辑一致。
const ORIGIN = { x: 0, y: 0 };

export function Mermaid({ chart }: { chart: string }) {
  // `wrapperRef` wraps the diagram for the Fullscreen API; `ref` is the inner
  // host where mermaid injects the rendered SVG.
  // `wrapperRef` 包裹整个图表供 Fullscreen API 使用；`ref` 是 mermaid 注入
  // 渲染后 SVG 的内层挂载点。
  const ref = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState(ORIGIN);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { locale } = useI18n();
  // Pick the labels for the current fumadocs locale, falling back to the
  // default language. `locale` may be undefined during SSR.
  // 按当前 fumadocs locale 选择对应文案，缺省时回退到默认语言；
  // SSR 阶段 locale 可能为 undefined。
  const labels =
    MERMAID_LABELS[(locale ?? DEFAULT_LOCALE) as keyof typeof MERMAID_LABELS] ??
    MERMAID_LABELS[DEFAULT_LOCALE];

  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const renderChart = useCallback(async () => {
    const code = chart?.trim();
    if (!code || !ref.current || !mountedRef.current) return;

    const id = `mermaid-${++counter}`;

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: resolvedTheme === 'dark' ? 'dark' : 'default',
      });

      const { svg } = await mermaid.render(id, code);

      if (!mountedRef.current) return;
      if (ref.current) {
        ref.current.innerHTML = svg;
      }
    } catch {
      if (!mountedRef.current) return;
      if (ref.current) {
        ref.current.textContent = code;
      }
      const leftover = document.getElementById(`d${id}`);
      if (leftover) leftover.remove();
    }
  }, [chart, resolvedTheme]);

  useEffect(() => {
    if (!mounted) return;
    renderChart();
  }, [renderChart, mounted]);

  // ── Zoom controls / 缩放控制 ─────────────────────────────────────
  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPan(ORIGIN);
  }, []);

  // ── Drag-to-pan controls / 拖动平移控制 ────────────────────────
  // Ref-based drag bookkeeping avoids re-renders while the pointer is moving;
  // we only commit to React state on each `pointermove`.
  // 用 ref 保存拖动中间状态，pointermove 时再写入 React state，避免额外渲染。
  const dragStateRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
    moved: boolean;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Only the primary button (left mouse / single touch / pen barrel=0) starts a drag.
      // 仅主指针（鼠标左键 / 单指触摸 / 笔尖）触发拖动。
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const target = e.currentTarget;
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // Some browsers reject capture for non-primary pointers; fall through
        // and rely on window-level move listeners if the pointer leaves the
        // canvas before release.
        // 部分浏览器对非主指针拒绝 capture；指针移出画布前若未释放，
        // 退化为靠 window 级 move 监听兜底。
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
      // Capture may already be released by the browser; safe to ignore.
      // 浏览器可能已自动释放，忽略即可。
    }
    dragStateRef.current = null;
    setIsDragging(false);
  }, []);

  // ── Fullscreen controls / 全屏控制 ─────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    if (!wrapperRef.current) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await wrapperRef.current.requestFullscreen();
      }
    } catch {
      // Fullscreen may be rejected (e.g. user gesture required, insecure
      // context); silently ignore so the toolbar keeps responding.
      // 全屏请求可能因需要用户手势 / 非安全上下文等原因被拒绝，静默忽略即可。
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // CSS custom properties drive the SVG transform inside the zoom target so
  // we don't have to mutate the SVG node directly.
  // 使用 CSS 变量驱动缩放容器内的 SVG transform，避免直接操作 SVG 节点。
  const zoomStyle = {
    '--mermaid-scale': scale,
    '--mermaid-pan-x': `${pan.x}px`,
    '--mermaid-pan-y': `${pan.y}px`,
  } as CSSProperties;
  const canZoomOut = scale > MIN_SCALE;
  const canZoomIn = scale < MAX_SCALE;
  // Reset is available when either the zoom or the pan has been changed.
  // 缩放或平移任一被改动即可重置。
  const canReset = scale !== 1 || pan.x !== 0 || pan.y !== 0;

  return (
    <div ref={wrapperRef} className="mermaid-wrapper not-prose group/mermaid relative my-4">
      {/* The wrapper hosts the fullscreen target. The canvas inside is the
          actual scroll / zoom / drag area; toolbar floats at the bottom-center.
          wrapper 是全屏目标，canvas 是滚动 / 缩放 / 拖动区域，工具栏悬浮在底部居中。 */}
      <div
        className="mermaid-canvas"
        data-dragging={isDragging || undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div ref={ref} className="mermaid-zoom-target" style={zoomStyle} />
      </div>

      <div role="toolbar" aria-label={labels.mermaidToolbar} className="mermaid-toolbar glass-chip">
        <button
          type="button"
          onClick={zoomOut}
          disabled={!canZoomOut}
          aria-label={labels.mermaidZoomOut}
          className="mermaid-toolbar__btn"
        >
          <ZoomOut className="size-4" />
        </button>
        <span aria-live="polite" className="mermaid-toolbar__scale tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={zoomIn}
          disabled={!canZoomIn}
          aria-label={labels.mermaidZoomIn}
          className="mermaid-toolbar__btn"
        >
          <ZoomIn className="size-4" />
        </button>
        <span aria-hidden="true" className="mermaid-toolbar__divider" />
        <button
          type="button"
          onClick={resetZoom}
          disabled={!canReset}
          aria-label={labels.mermaidReset}
          className="mermaid-toolbar__btn"
        >
          <RotateCcw className="size-4" />
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? labels.mermaidExitFullscreen : labels.mermaidFullscreen}
          className="mermaid-toolbar__btn"
        >
          {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
        </button>
      </div>
    </div>
  );
}
