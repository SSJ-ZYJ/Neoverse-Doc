// Mermaid diagram renderer with zoom / pan / reset / maximize controls and a
// render / code view toggle. Initializes mermaid on mount and re-renders
// whenever the chart source or theme changes. Falls back to raw text on error.
// The floating toolbar is portaled to document.body in non-maximized mode so
// its backdrop-filter can sample the actual page + SVG content behind it
// (unaffected by intermediate backdrop roots like #nd-page).
// Mermaid 图表渲染器（带缩放 / 拖动 / 重置 / 视口内放大控制与渲染 / 代码
// 视图切换）。挂载时初始化 mermaid，当图表源码或主题变化时重新渲染。
// 出错时回退为原始文本。非全屏模式下，悬浮工具栏通过 Portal 挂到
// document.body，使其 backdrop-filter 能采样到后方真实的页面内容与 SVG
// （不受 #nd-page 等中间 backdrop root 影响）。

'use client';

import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { Code2, Eye, Maximize, Minimize, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import { type CSSProperties, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getPageDictionary } from '@/dictionaries';
import { useAnchoredToolbarPosition } from '@/lib/hooks/use-anchored-toolbar-position';
import { useFitCanvasScale } from '@/lib/hooks/use-fit-canvas-scale';
import { useMermaidMaximize } from '@/lib/hooks/use-mermaid-maximize';
import { useMermaidRender } from '@/lib/hooks/use-mermaid-render';
import { useMermaidViewMode } from '@/lib/hooks/use-mermaid-view-mode';
import { useSvgViewBoxExpander } from '@/lib/hooks/use-svg-viewbox-expander';
import { useZoomAndPan } from '@/lib/hooks/use-zoom-and-pan';
import { resolveLocale } from '@/lib/i18n';

// Start diagram work before it enters the viewport so scrolling never exposes an unloaded canvas.
// 图表进入视口前提前启动渲染，避免滚动时暴露尚未加载的画布。
const MERMAID_RENDER_ROOT_MARGIN = '600px 0px';

export function Mermaid({ chart }: { chart: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inPageWrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Unique id for the shared SVG drop-shadow filter. Defined once per Mermaid
  // instance so all .node elements in the same diagram reference a single
  // filter definition instead of each node running its own CSS drop-shadow.
  // The browser caches the filter result and reuses it across nodes,
  // dramatically reducing repaint cost on complex diagrams (dozens of nodes).
  // Colons from useId() are stripped because they need escaping in url(#id).
  // 共享 SVG drop-shadow 滤镜的唯一 id。每个 Mermaid 实例定义一次，
  // 使同一图表中所有 .node 元素引用单一滤镜定义，而非每个节点各自运行
  // CSS drop-shadow。浏览器缓存滤镜结果并在节点间复用，显著降低复杂图
  // （几十节点）的重绘成本。useId() 返回的冒号被移除，因为在 url(#id) 中
  // 需要转义。
  const filterId = `mermaid-shadow-${useId().replace(/:/g, '')}`;

  // View mode toggle: 'render' (SVG) or 'code' (editable source). The
  // preference is persisted to localStorage via the hook so the last-used
  // view is restored on revisit.
  // 视图模式切换：'render'（SVG）或 'code'（可编辑源码）。偏好通过
  // Hook 持久化到 localStorage，重新访问时恢复上次使用的视图。
  const { viewMode, setViewMode, toggleViewMode } = useMermaidViewMode();
  // Edited chart source — diverges from the original prop once the user
  // types in the code view. Passed to the render hook so switching back to
  // render view re-renders with the latest edits.
  // 编辑后的图表源码 —— 用户在代码视图中输入后会与原始 prop 不同。
  // 传递给渲染 Hook，使切回渲染视图时以最新编辑内容重新渲染。
  const [editedChart, setEditedChart] = useState(chart);

  const { resolvedTheme } = useTheme();
  const { locale } = useI18n();
  // Locale from fumadocs i18n context is a string; resolve to a valid Locale
  // and pull labels from the shared dictionary (single source of truth).
  // fumadocs i18n 上下文返回的 locale 为字符串，统一解析为合法 Locale
  // 后从共享字典（唯一来源）取工具栏文案。
  const labels = getPageDictionary(resolveLocale(locale));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (shouldRender) return;

    const wrapper = inPageWrapperRef.current;
    if (!wrapper || typeof IntersectionObserver === 'undefined') {
      setShouldRender(true);
      return;
    }

    // Render once the diagram approaches the viewport; no observer remains afterward.
    // 图表接近视口时仅触发一次渲染，随后立即释放观察器。
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setShouldRender(true);
        observer.disconnect();
      },
      { rootMargin: MERMAID_RENDER_ROOT_MARGIN },
    );
    observer.observe(wrapper);

    return () => observer.disconnect();
  }, [shouldRender]);

  // Only render the SVG when the diagram has approached the viewport AND the
  // user is viewing the rendered diagram (not the code editor). This avoids
  // spending CPU on rendering while the user is editing the source; switching
  // back to render view re-enables rendering and picks up the latest edits.
  // 仅当图表接近视口且用户处于渲染视图（而非代码编辑器）时才渲染 SVG。
  // 避免用户编辑源码时浪费 CPU 渲染；切回渲染视图时重新启用渲染并采用最新编辑。
  const svgContent = useMermaidRender(
    editedChart,
    resolvedTheme === 'dark' ? 'dark' : 'default',
    shouldRender && viewMode === 'render',
  );
  const {
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
  } = useZoomAndPan();
  const { svgNatural } = useSvgViewBoxExpander(svgContent, inPageWrapperRef, wrapperRef);
  const { isMaximized, toggleMaximize } = useMermaidMaximize(
    scale,
    setScale,
    pan,
    setPan,
    svgNatural,
  );
  const fitCanvasScale = useFitCanvasScale(svgNatural, canvasRef, isMaximized, setScale);
  // Reset targets the measured fit for whichever canvas is active; this also
  // keeps the disabled state accurate when a wide inline diagram is already fitted.
  // 重置以当前画布实测适配比例为目标；宽图已正确适配时，按钮禁用状态也保持准确。
  const canResetToFit = Math.abs(scale - fitCanvasScale) > 0.005 || pan.x !== 0 || pan.y !== 0;

  // The fit scale locks the canvas layout frame; interactive scale is applied
  // only to the centered SVG host so toolbar zoom never resizes the canvas.
  // 适配比例锁定画布布局框；交互缩放仅作用于居中的 SVG，工具栏缩放不会改变画布尺寸。
  const zoomStyle = {
    '--svg-w': `${svgNatural.width}px`,
    '--svg-h': `${svgNatural.height}px`,
    '--svg-frame-w': `${svgNatural.width * fitCanvasScale}px`,
    '--svg-frame-h': `${svgNatural.height * fitCanvasScale}px`,
    '--mermaid-scale': scale,
    '--mermaid-pan-x': `${pan.x}px`,
    '--mermaid-pan-y': `${pan.y}px`,
    // Pass the instance-scoped filter id to CSS so .node elements can reference
    // the shared SVG filter via var(--mermaid-node-shadow-filter).
    // 将实例作用域的滤镜 id 传给 CSS，使 .node 元素可通过
    // var(--mermaid-node-shadow-filter) 引用共享 SVG 滤镜。
    '--mermaid-node-shadow-filter': `url(#${filterId})`,
  } as CSSProperties;

  // The toolbar is visible whenever there is rendered SVG OR the user is in
  // code view (where the toggle + maximize buttons are still needed).
  // 工具栏在有渲染 SVG 或用户处于代码视图（仍需切换 + 放大按钮）时可见。
  const toolbarVisible = mounted && (Boolean(svgContent) || viewMode === 'code');

  // Keyboard shortcut: press 'v' while the wrapper is focused to toggle
  // between render and code view. Ignored when typing in the textarea so the
  // character is inserted normally. Modifier keys (Ctrl/Meta/Alt) are also
  // excluded to avoid clashing with browser shortcuts.
  // 键盘快捷键：聚焦 wrapper 后按 'v' 在渲染 / 代码视图间切换。
  // 在文本域中输入时忽略，使字符正常插入。同时排除修饰键（Ctrl/Meta/Alt），
  // 避免与浏览器快捷键冲突。
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key.toLowerCase() === 'v' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleViewMode();
      }
    },
    [toggleViewMode],
  );

  // Imperative positioning avoids a React state update for every scroll event.
  // 命令式定位避免每次滚动事件都触发 React 状态更新。
  useAnchoredToolbarPosition(inPageWrapperRef, toolbarRef, toolbarVisible, isMaximized);

  const toolbar = (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label={labels.mermaidToolbar}
      className="mermaid-toolbar"
      data-portaled={isMaximized ? 'maximized' : 'true'}
    >
      <div className="mermaid-toolbar__controls">
        {/* View mode segmented toggle: render (SVG) vs. code (source editor).
           The active segment is highlighted to give clear visual feedback of
           the current view mode. / 视图模式分段切换：渲染（SVG）与代码
          （源码编辑器）。激活段高亮显示，明确指示当前视图模式。 */}
        {/* biome-ignore lint/a11y/useSemanticElements: <fieldset> would add unwanted default styling; a div with role="group" is a valid ARIA pattern for toolbar sub-groups. */}
        <div
          className="mermaid-toolbar__view-toggle"
          role="group"
          aria-label={labels.mermaidViewMode}
        >
          <button
            type="button"
            onClick={() => setViewMode('render')}
            aria-pressed={viewMode === 'render'}
            aria-label={labels.mermaidViewRender}
            title={labels.mermaidViewRender}
            className="mermaid-toolbar__btn mermaid-toolbar__view-btn"
            data-active={viewMode === 'render' || undefined}
          >
            <Eye className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('code')}
            aria-pressed={viewMode === 'code'}
            aria-label={labels.mermaidViewCode}
            title={labels.mermaidViewCode}
            className="mermaid-toolbar__btn mermaid-toolbar__view-btn"
            data-active={viewMode === 'code' || undefined}
          >
            <Code2 className="size-4" />
          </button>
        </div>
        <span aria-hidden="true" className="mermaid-toolbar__divider" />
        <button
          type="button"
          onClick={zoomOut}
          disabled={!canZoomOut || viewMode === 'code'}
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
          disabled={!canZoomIn || viewMode === 'code'}
          aria-label={labels.mermaidZoomIn}
          className="mermaid-toolbar__btn"
        >
          <ZoomIn className="size-4" />
        </button>
        <span aria-hidden="true" className="mermaid-toolbar__divider" />
        <button
          type="button"
          onClick={() => resetZoomTo(fitCanvasScale)}
          disabled={!canResetToFit || viewMode === 'code'}
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
    </div>
  );

  const canvasOnly = (
    <div
      ref={canvasRef}
      className="mermaid-canvas"
      data-view={viewMode}
      data-dragging={isDragging || undefined}
      onPointerDown={viewMode === 'render' ? handlePointerDown : undefined}
      onPointerMove={viewMode === 'render' ? handlePointerMove : undefined}
      onPointerUp={viewMode === 'render' ? endDrag : undefined}
      onPointerCancel={viewMode === 'render' ? endDrag : undefined}
    >
      {/* Only the active view is rendered. Switching mounts the new view, which
         triggers a simple fade-in CSS animation. This avoids the cross-fade
         flicker that occurred when both layers were simultaneously visible.
         仅渲染激活视图。切换时挂载新视图，触发 CSS 淡入动画。
         避免两个视图层同时可见时交叉淡入淡出的闪烁。 */}
      {viewMode === 'render' ? (
        <div className="mermaid-zoom-target" style={zoomStyle}>
          {/* Shared SVG drop-shadow filter definition. All .node elements in
             this diagram reference it via var(--mermaid-node-shadow-filter),
             so the browser caches the filter result once and reuses it
             across every node — a major repaint saving on complex diagrams
             with dozens of nodes. The <svg> itself is invisible (no width/
             height) and only hosts the <defs>. / 共享 SVG drop-shadow 滤镜
            定义。本图表中所有 .node 元素通过 var(--mermaid-node-shadow-filter)
            引用它，浏览器缓存一次滤镜结果并在所有节点间复用 —— 对含几十
            个节点的复杂图是重大重绘节省。<svg> 自身不可见（无宽高），仅
            承载 <defs>。 */}
          <svg className="mermaid-defs" aria-hidden="true" focusable="false">
            <defs>
              <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0.4rem" stdDeviation="0.75rem" />
              </filter>
            </defs>
          </svg>
          {svgContent ? (
            <div
              className="mermaid-svg-host"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG markup is generated by mermaid from the page's own chart source, not untrusted input.
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : (
            <pre className="mermaid-fallback">{editedChart}</pre>
          )}
        </div>
      ) : (
        <div className="mermaid-code-view">
          <textarea
            className="mermaid-code-editor"
            value={editedChart}
            onChange={(e) => setEditedChart(e.target.value)}
            spellCheck={false}
            aria-label={labels.mermaidCodeEditor}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const target = e.currentTarget;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const newValue = `${target.value.slice(0, start)}  ${target.value.slice(end)}`;
                setEditedChart(newValue);
                requestAnimationFrame(() => {
                  target.selectionStart = target.selectionEnd = start + 2;
                });
              }
            }}
          />
        </div>
      )}
    </div>
  );

  const inPageWrapper = (
    <div
      ref={inPageWrapperRef}
      className="mermaid-wrapper not-prose group/mermaid my-4"
      data-page-renderer
      data-hidden={isMaximized || undefined}
      aria-hidden={isMaximized || undefined}
      // Make the wrapper focusable so the 'v' keyboard shortcut works.
      // When maximized (and hidden), remove it from the tab order.
      // 使 wrapper 可聚焦以支持 'v' 键盘快捷键。全屏（隐藏）时移出 tab 序列。
      tabIndex={isMaximized ? -1 : 0}
      onKeyDown={handleKeyDown}
    >
      {canvasOnly}
    </div>
  );

  const maximizedWrapper = (
    // biome-ignore lint/a11y/noStaticElementInteractions: The maximized wrapper is intentionally focusable to support the 'v' keyboard shortcut for toggling views.
    <div
      ref={wrapperRef}
      className="mermaid-wrapper not-prose group/mermaid my-4"
      data-maximized
      tabIndex={isMaximized ? 0 : -1}
      onKeyDown={handleKeyDown}
    >
      {canvasOnly}
    </div>
  );

  const maximizedBackdrop = <div className="mermaid-maximized-backdrop" aria-hidden="true" />;

  // Portal the toolbar once mounted AND there is something to show — either a
  // rendered SVG (render view) or the code editor (code view). In code view
  // svgContent may be null because rendering is intentionally disabled, so the
  // viewMode check keeps the toolbar available.
  // 当挂载且有内容可显示时 Portal 工具栏 —— 渲染的 SVG（渲染视图）或代码
  // 编辑器（代码视图）。代码视图中 svgContent 可能为 null（渲染被有意禁用），
  // 因此通过 viewMode 检查保持工具栏可用。
  if (mounted && (svgContent || viewMode === 'code') && typeof document !== 'undefined') {
    return (
      <>
        {inPageWrapper}
        {isMaximized ? (
          <>
            {createPortal(maximizedBackdrop, document.body)}
            {createPortal(maximizedWrapper, document.body)}
            {createPortal(toolbar, document.body)}
          </>
        ) : (
          createPortal(toolbar, document.body)
        )}
      </>
    );
  }
  return inPageWrapper;
}
