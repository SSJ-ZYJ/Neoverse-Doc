// Mermaid diagram renderer with zoom / pan / reset / maximize controls and a
// render / code view toggle. Mermaid loads near the viewport and re-renders
// only when chart source changes; theme colors update through CSS variables.
// Falls back to raw text on error.
// The floating toolbar stays inside the diagram wrapper in normal mode so it
// shares the wrapper's scroll position and stacking order. Only maximized mode
// portals it to document.body alongside the fullscreen diagram.
// Mermaid 图表渲染器（带缩放 / 拖动 / 重置 / 视口内放大控制与渲染 / 代码
// 视图切换）。图表接近视口时加载，仅在源码变化时重新渲染；主题配色通过
// CSS 变量更新。出错时回退为原始文本。普通模式下工具栏保留在图表 wrapper 内，与图表
// 共用滚动位置和层叠顺序；仅最大化模式随全屏图表 Portal 到 document.body。

'use client';

import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { Code2, Eye, Maximize, Minimize, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { getPageDictionary } from '@/dictionaries';
import { useFitCanvasScale } from '@/lib/hooks/use-fit-canvas-scale';
import { useMermaidMaximize } from '@/lib/hooks/use-mermaid-maximize';
import { useMermaidRender } from '@/lib/hooks/use-mermaid-render';
import { useMermaidViewMode } from '@/lib/hooks/use-mermaid-view-mode';
import { useSvgViewBoxExpander } from '@/lib/hooks/use-svg-viewbox-expander';
import { DEFAULT_SCALE, ORIGIN, useZoomAndPan } from '@/lib/hooks/use-zoom-and-pan';
import { resolveLocale } from '@/lib/i18n';

// Start diagram work before it enters the viewport so scrolling never exposes an unloaded canvas.
// 图表进入视口前提前启动渲染，避免滚动时暴露尚未加载的画布。
const MERMAID_RENDER_ROOT_MARGIN = '600px 0px';
// Keep the wheel-zoom transition active briefly after the last wheel event so
// the final 140ms glide can finish before the default (longer) transitions
// resume. Without this buffer, switching transition durations mid-flight
// would cause a visible hitch at the end of a zoom burst.
// 最后一次滚轮事件后短暂保留滚轮过渡，使最后的 140ms 滑行能在默认（更长）
// 过渡恢复前完成。否则过渡时长在飞行中切换会在缩放 bursts 末尾造成可见顿挫。
const WHEEL_ZOOM_SETTLE_DELAY = 180;

type MermaidCodeViewProps = {
  chart: string;
  codeViewLabel: string;
  renderedDiagramHeight: number;
};

// Measure the read-only source at its current width so short Mermaid code uses
// only its natural height, while longer code scrolls within the rendered
// diagram's height. Each mounted view owns its refs because maximize mode keeps
// both an in-page placeholder and a portaled copy in the DOM.
// 按当前宽度测量只读源码，使较短 Mermaid 代码仅占自身自然高度，较长代码
// 则在渲染图高度内滚动。每个已挂载视图独立持有 ref，因为放大模式会同时在
// DOM 中保留文档内占位副本和 Portal 副本。
function MermaidCodeView({ chart, codeViewLabel, renderedDiagramHeight }: MermaidCodeViewProps) {
  const codeViewRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  const measureContentHeight = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Preserve scroll position across the height collapse below. Temporarily
    // shrinking the textarea to 0px makes the scroll container's content
    // shorter than its viewport, which clamps scrollTop to 0 in the browser
    // and is never restored — leaving the code view jumped back to the top.
    // 测量前保存滚动位置。下方将 textarea 高度临时塌缩为 0px 会使滚动
    // 容器内容短于视口，浏览器会把 scrollTop 钳制为 0 且不会自动还原，
    // 导致代码视图跳回顶部。
    const codeView = codeViewRef.current;
    const savedScrollTop = codeView?.scrollTop ?? 0;

    const previousHeight = editor.style.height;
    editor.style.height = '0px';
    const nextHeight = editor.scrollHeight;
    editor.style.height = previousHeight;

    if (codeView) codeView.scrollTop = savedScrollTop;

    setContentHeight((currentHeight) =>
      currentHeight === nextHeight ? currentHeight : nextHeight,
    );
  }, []);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.value !== chart.replace(/\r\n/g, '\n')) return;

    measureContentHeight();

    const codeView = codeViewRef.current;
    if (!codeView || typeof ResizeObserver === 'undefined') return;

    let measuredWidth = codeView.getBoundingClientRect().width;
    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = entry?.contentRect.width ?? measuredWidth;
      if (Math.abs(nextWidth - measuredWidth) < 0.5) return;
      measuredWidth = nextWidth;
      measureContentHeight();
    });
    observer.observe(codeView);

    return () => observer.disconnect();
  }, [chart, measureContentHeight]);

  // CSS keeps the previous fixed limits as first-render fallbacks. Once both
  // measurements exist, content height controls the editor and the rendered
  // diagram height caps only the scrollable viewport.
  // CSS 保留原固定限制作为首帧兜底；两项测量完成后，内容高度控制编辑器，
  // 渲染图高度仅限制可滚动视口。
  const codeViewStyle = {
    ...(contentHeight > 0 ? { '--mermaid-code-content-height': `${contentHeight}px` } : undefined),
    ...(renderedDiagramHeight > 0
      ? { '--mermaid-code-render-height': `${renderedDiagramHeight}px` }
      : undefined),
  } as CSSProperties;

  return (
    <div ref={codeViewRef} className="mermaid-code-view" style={codeViewStyle}>
      <textarea
        ref={editorRef}
        className="mermaid-code-editor"
        value={chart}
        readOnly
        spellCheck={false}
        aria-label={codeViewLabel}
      />
    </div>
  );
}

export function Mermaid({ chart }: { chart: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inPageWrapperRef = useRef<HTMLDivElement>(null);
  const inPageCanvasRef = useRef<HTMLDivElement>(null);
  const maximizedCanvasRef = useRef<HTMLDivElement>(null);
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

  // View mode toggle: 'render' (SVG) or 'code' (read-only source). The
  // preference is persisted to localStorage via the hook so the last-used
  // view is restored on revisit.
  // 视图模式切换：'render'（SVG）或 'code'（只读源码）。偏好通过
  // Hook 持久化到 localStorage，重新访问时恢复上次使用的视图。
  const { viewMode, setViewMode, toggleViewMode } = useMermaidViewMode();
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
  // user is viewing the rendered diagram. Code view can display the original
  // source without keeping the heavyweight renderer active.
  // 仅当图表接近视口且用户处于渲染视图时才渲染 SVG。代码视图可直接展示
  // 原始源码，无需让较重的渲染器持续运行。
  const svgContent = useMermaidRender(chart, shouldRender && viewMode === 'render');
  const {
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
  } = useZoomAndPan();
  const { isMaximized, toggleMaximize } = useMermaidMaximize(scale, setScale, pan, setPan);
  const { svgNatural } = useSvgViewBoxExpander(
    svgContent,
    inPageWrapperRef,
    wrapperRef,
    isMaximized,
  );
  const { fitCanvasScale, recomputeFitCanvasScale } = useFitCanvasScale(
    svgNatural,
    inPageCanvasRef,
    maximizedCanvasRef,
    isMaximized,
  );
  // Reuse the rendered diagram's fitted block size as the code viewport cap.
  // The code component still shrinks below this value when its content is shorter.
  // 复用渲染图适配后的块轴尺寸作为代码视口上限；代码内容更短时仍会收缩。
  const renderedDiagramHeight = svgNatural.height * fitCanvasScale;
  // Reset restores logical zoom/pan and remeasures the active canvas. Keeping
  // it available at 100% also provides a recovery path after viewport changes.
  // 重置同时恢复逻辑缩放、平移并重新测量当前画布；即使显示为 100%，也保留
  // 操作入口，以便在视口变化后主动恢复适配。
  const handleResetZoom = useCallback(() => {
    resetZoom();
    recomputeFitCanvasScale();
  }, [recomputeFitCanvasScale, resetZoom]);
  // Reset remains available whenever zoom or pan differs from the centered
  // 100% baseline, including a dragged canvas that still reads as 100%.
  // 缩放或平移偏离居中的 100% 基线时均可重置，包括比例仍显示 100% 的拖动画布。
  const canResetZoom =
    Math.abs(scale - DEFAULT_SCALE) > 0.005 || pan.x !== ORIGIN.x || pan.y !== ORIGIN.y;

  // The fit scale locks the canvas layout frame and combines with the logical
  // user scale only for painting. Toolbar zoom never resizes the canvas, while
  // its percentage remains relative to the fitted 100% baseline.
  // 适配比例锁定画布布局框，仅在绘制时与用户逻辑比例相乘；工具栏缩放不会
  // 改变画布尺寸，其百分比始终相对于适配后的 100% 基线。
  const zoomStyle = {
    '--svg-w': `${svgNatural.width}px`,
    '--svg-h': `${svgNatural.height}px`,
    '--svg-frame-w': `${svgNatural.width * fitCanvasScale}px`,
    '--svg-frame-h': `${svgNatural.height * fitCanvasScale}px`,
    '--mermaid-scale': fitCanvasScale * scale,
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

  // Install a non-passive wheel listener only on the maximized render canvas.
  // Inline diagrams retain normal page scrolling, while maximized code view
  // keeps its native editor scrolling. The hook compensates pan against the
  // pointer position so zooming is anchored beneath the cursor.
  // 仅在全屏渲染画布上安装非被动滚轮监听。页面内图表保留正常页面滚动，
  // 全屏代码视图保留编辑器原生滚动；Hook 会依据指针位置补偿平移量，使缩放
  // 锚定在光标下方。
  useEffect(() => {
    if (!isMaximized || viewMode !== 'render') return;

    const canvas = wrapperRef.current?.querySelector<HTMLElement>('.mermaid-canvas');
    const zoomTarget = canvas?.querySelector<HTMLElement>('.mermaid-zoom-target');
    if (!canvas || !zoomTarget) return;

    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      canvas.dataset.wheelZooming = 'true';
      zoomAtPoint({
        clientX: event.clientX,
        clientY: event.clientY,
        deltaY: event.deltaY,
        deltaMode: event.deltaMode,
        target: zoomTarget,
      });

      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        delete canvas.dataset.wheelZooming;
      }, WHEEL_ZOOM_SETTLE_DELAY);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      if (settleTimer) clearTimeout(settleTimer);
      delete canvas.dataset.wheelZooming;
    };
  }, [isMaximized, viewMode, zoomAtPoint]);

  const toolbar = (
    <div
      role="toolbar"
      aria-label={labels.mermaidToolbar}
      className="mermaid-toolbar"
      data-portaled={isMaximized ? 'maximized' : undefined}
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
        {/* Zoom controls share one segmented surface with the percentage readout.
           缩放按钮与比例读数共用一个分段表面。 */}
        <div className="mermaid-toolbar__group mermaid-toolbar__zoom-controls">
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
        </div>
        {/* Canvas-level actions form the final compact segment.
           画布级操作组成末尾的紧凑分段。 */}
        <div className="mermaid-toolbar__group mermaid-toolbar__canvas-actions">
          <button
            type="button"
            onClick={handleResetZoom}
            disabled={!canResetZoom || viewMode === 'code'}
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
    </div>
  );

  const renderCanvas = (
    activeCanvasRef: RefObject<HTMLDivElement | null>,
    includeRenderedSvg = true,
  ) => (
    <div
      ref={activeCanvasRef}
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
          {includeRenderedSvg ? (
            <svg className="mermaid-defs" aria-hidden="true" focusable="false">
              <defs>
                <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0.4rem" stdDeviation="0.75rem" />
                </filter>
              </defs>
            </svg>
          ) : null}
          {includeRenderedSvg && svgContent ? (
            <div
              className="mermaid-svg-host"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG markup is generated by mermaid from the page's own chart source, not untrusted input.
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : includeRenderedSvg ? (
            <pre className="mermaid-fallback">{chart}</pre>
          ) : null}
        </div>
      ) : (
        <MermaidCodeView
          chart={chart}
          codeViewLabel={labels.mermaidSourceCode}
          renderedDiagramHeight={renderedDiagramHeight}
        />
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
      {/* Keep only the fitted layout frame while maximized. Mounting the same
          Mermaid SVG in both wrappers duplicates marker ids, causing the
          portaled diagram to resolve arrowheads from the hidden page copy.
          最大化时仅保留适配后的布局框。若两个 wrapper 同时挂载同一份
          Mermaid SVG，会产生重复 marker id，并让全屏图引用隐藏副本中的箭头。 */}
      {renderCanvas(inPageCanvasRef, !isMaximized)}
      {toolbarVisible && !isMaximized ? toolbar : null}
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
      {renderCanvas(maximizedCanvasRef)}
    </div>
  );

  const maximizedBackdrop = <div className="mermaid-maximized-backdrop" aria-hidden="true" />;

  // Normal mode keeps the toolbar inside the in-page wrapper. Maximized mode
  // portals the backdrop, diagram, and toolbar together above the document.
  // 普通模式将工具栏保留在文档内 wrapper；最大化模式再把背景、图表与工具栏
  // 一并 Portal 到文档上层。
  if (
    isMaximized &&
    mounted &&
    (svgContent || viewMode === 'code') &&
    typeof document !== 'undefined'
  ) {
    return (
      <>
        {inPageWrapper}
        {createPortal(maximizedBackdrop, document.body)}
        {createPortal(maximizedWrapper, document.body)}
        {createPortal(toolbar, document.body)}
      </>
    );
  }
  return inPageWrapper;
}
