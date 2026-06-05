// Mermaid diagram renderer with zoom / pan / reset / maximize controls.
// Initializes mermaid on mount and re-renders whenever the chart source or
// theme changes. Falls back to raw text on error.
// Mermaid 图表渲染器（带缩放 / 拖动 / 重置 / 视口内放大控制）。挂载时
// 初始化 mermaid，当图表源码或主题变化时重新渲染。出错时回退为原始文本。

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
import { createPortal } from 'react-dom';
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
  // `wrapperRef` wraps the diagram; the wrapper is portaled to <body> when
  // maximized so the position: fixed layout escapes ancestor stacking
  // contexts (e.g. docs-transition's will-change: transform) that would
  // otherwise pin the fixed box to the docs column.
  // `wrapperRef` 包裹整个图表；放大时通过 portal 挂到 <body> 下，
  // 避免被祖先的 will-change: transform 等包含块限定在文档列内。
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // `svgContent` holds the rendered SVG string. We keep it in React state
  // (rendered via dangerouslySetInnerHTML) rather than writing it into the
  // DOM imperatively, because the portal toggle (in-flow → body → in-flow)
  // unmounts and remounts the wrapper subtree — any `ref.innerHTML = …`
  // mutation would be wiped during the remount and the diagram would go
  // blank until a re-render of renderChart.
  // `svgContent` 保存渲染后的 SVG 字符串。放进 React state、并通过
  // dangerouslySetInnerHTML 渲染，而不是命令式地写入 DOM：portal 切换
  // （in-flow → body → in-flow）会卸载并重挂载 wrapper 子树，
  // `ref.innerHTML = …` 之类的命令式写入会在重挂载时被擦掉，导致
  // 图表显示为空。
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState(ORIGIN);
  const [isDragging, setIsDragging] = useState(false);
  // `isMaximized` is the page-level maximize flag (NOT the browser
  // Fullscreen API) — it pins the diagram to the viewport inside the page
  // and is exited via the toolbar button, the Escape key, or by re-clicking
  // maximize after returning to flow.
  // isMaximized 是页面级"放大铺满视口"标志（不是浏览器 Fullscreen API），
  // 可通过工具栏按钮、Esc 键或再次点击放大按钮退出。
  const [isMaximized, setIsMaximized] = useState(false);
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
    if (!code || !mountedRef.current) return;

    const id = `mermaid-${++counter}`;

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: resolvedTheme === 'dark' ? 'dark' : 'default',
      });

      const { svg } = await mermaid.render(id, code);
      if (!mountedRef.current) return;
      setSvgContent(svg);
    } catch {
      if (!mountedRef.current) return;
      setSvgContent(null);
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
        // Some browsers reject capture for non-primary pointers; the canvas
        // still receives move events via the pointer capture, so the drag
        // works as long as the pointer stays inside the wrapper.
        // 部分浏览器对非主指针拒绝 capture；指针被捕获的画布仍可收到 move
        // 事件，所以拖动在指针未离开 wrapper 时仍可正常工作。
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

  // ── Maximize (viewport) controls / 视口内放大控制 ────────────────
  const toggleMaximize = useCallback(() => {
    setIsMaximized((m) => !m);
  }, []);

  // Escape exits maximize for keyboard / accessibility parity with native
  // modals.
  // Esc 键退出放大态，贴近原生弹窗的键盘可访问性。
  useEffect(() => {
    if (!isMaximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMaximized(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isMaximized]);

  // Lock the body scroll while the diagram is filling the viewport, so a
  // wheel event outside the canvas doesn't scroll the page underneath.
  // 放大期间锁定 body 滚动，避免在 canvas 外部的滚轮事件把下方页面滚走。
  useEffect(() => {
    if (!isMaximized) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMaximized]);

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

  // Shared canvas + toolbar fragment. Both the in-page wrapper and the
  // maximized portal clone render the exact same subtree so React's event
  // delegation, state, and the SVG source all stay in sync. The two
  // containers are just different `position` / `visibility` shells.
  // 共用 canvas + toolbar 子树。in-page wrapper 与放大版 portal 克隆渲
  // 染完全相同的子树，事件代理、state 与 SVG 内容天然同步；
  // 两个外壳只差 position / visibility 之类的 CSS。
  const canvasAndToolbar = (
    <>
      {/* The canvas is the actual scroll / zoom / drag area.
          canvas 是滚动 / 缩放 / 拖动区域。 */}
      <div
        className="mermaid-canvas"
        data-dragging={isDragging || undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* Zoom target: holds the SVG (via React-owned dangerouslySetInnerHTML)
            and applies translate + scale via CSS variables. Using state for the
            SVG string means portal mount/unmount cycles re-inject the markup
            from the current state instead of leaving an empty box behind. The
            SVG and the error-fallback are rendered as siblings, never both
            children of the same node, so `noDangerouslySetInnerHtmlWithChildren`
            is structurally impossible.
            缩放目标：通过 React 拥有的 dangerouslySetInnerHTML 容纳 SVG，
            并通过 CSS 变量应用 translate + scale。SVG 字符串放进 state 后，
            portal 的挂载/卸载循环会基于最新 state 重新注入内容，
            避免留下空白盒子。SVG 与错误回退互为兄弟节点，永远不会同时
            作为某个节点的 children，从结构上规避 children 与 innerHTML
            共存的检查。 */}
        <div className="mermaid-zoom-target" style={zoomStyle}>
          {svgContent ? (
            <div
              className="mermaid-svg-host"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG markup is generated by mermaid from the page's own chart source, not untrusted input.
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : (
            <pre className="mermaid-fallback">{chart}</pre>
          )}
        </div>
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
          onClick={toggleMaximize}
          aria-label={isMaximized ? labels.mermaidRestore : labels.mermaidMaximize}
          className="mermaid-toolbar__btn"
        >
          {isMaximized ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
        </button>
      </div>
    </>
  );

  // In-page wrapper: ALWAYS rendered at the diagram's semantic position in
  // the docs content. When maximized we hide it with `visibility: hidden`
  // (which keeps the layout footprint — no reflow, no page jump) and render
  // a maximized clone to <body> via portal. This way:
  //   - The page layout never shifts when toggling maximize
  //   - The clone escapes any `will-change: transform` containing block in
  //     the docs content (e.g. docs-transition's framer-motion wrapper),
  //     so `position: fixed` is bounded by the viewport
  //   - State, event handlers, and SVG markup are shared between both
  //     views — no duplication of logic, no sync issues
  // 始终在文档里渲染的 wrapper：永远占住图表在文档中的位置。放大时用
  // `visibility: hidden` 隐藏（保留布局占位 — 不重排、不抖页），
  // 同时通过 portal 在 <body> 渲一株放大克隆。优点：
  //   - 切换放大态时页面布局完全不变，没有上下跳变
  //   - 克隆脱离了文档流里的 will-change: transform 包含块
  //     （如 docs-transition 的 framer-motion wrapper），position: fixed
  //     以视口为基准
  //   - state、事件与 SVG 内容两边天然共享 — 不复制逻辑、无同步问题
  const inPageWrapper = (
    <div
      className="mermaid-wrapper not-prose group/mermaid my-4"
      data-page-renderer
      data-hidden={isMaximized || undefined}
      aria-hidden={isMaximized || undefined}
    >
      {canvasAndToolbar}
    </div>
  );

  const maximizedWrapper = (
    <div ref={wrapperRef} className="mermaid-wrapper not-prose group/mermaid my-4" data-maximized>
      {canvasAndToolbar}
    </div>
  );

  if (mounted && isMaximized && typeof document !== 'undefined') {
    return (
      <>
        {inPageWrapper}
        {createPortal(maximizedWrapper, document.body)}
      </>
    );
  }
  return inPageWrapper;
}
