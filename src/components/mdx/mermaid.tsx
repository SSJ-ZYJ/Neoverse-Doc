// Mermaid diagram renderer with zoom / pan / reset / maximize controls.
// Initializes mermaid on mount and re-renders whenever the chart source or
// theme changes. Falls back to raw text on error.
// The floating toolbar is portaled to document.body in non-maximized mode so
// its backdrop-filter can sample the actual page + SVG content behind it
// (unaffected by intermediate backdrop roots like #nd-page).
// Mermaid 图表渲染器（带缩放 / 拖动 / 重置 / 视口内放大控制）。挂载时
// 初始化 mermaid，当图表源码或主题变化时重新渲染。出错时回退为原始文本。
// 非全屏模式下，悬浮工具栏通过 Portal 挂到 document.body，使其 backdrop-filter
// 能采样到后方真实的页面内容与 SVG（不受 #nd-page 等中间 backdrop root 影响）。

'use client';

import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { Maximize, Minimize, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getPageDictionary } from '@/dictionaries';
import { useAnchoredToolbarPosition } from '@/lib/hooks/use-anchored-toolbar-position';
import { useFitCanvasScale } from '@/lib/hooks/use-fit-canvas-scale';
import { useMermaidMaximize } from '@/lib/hooks/use-mermaid-maximize';
import { useMermaidRender } from '@/lib/hooks/use-mermaid-render';
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

  const svgContent = useMermaidRender(
    chart,
    resolvedTheme === 'dark' ? 'dark' : 'default',
    shouldRender,
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
  } as CSSProperties;

  // Imperative positioning avoids a React state update for every scroll event.
  // 命令式定位避免每次滚动事件都触发 React 状态更新。
  useAnchoredToolbarPosition(
    inPageWrapperRef,
    toolbarRef,
    mounted && Boolean(svgContent),
    isMaximized,
  );

  const toolbar = (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label={labels.mermaidToolbar}
      className="mermaid-toolbar"
      data-portaled={isMaximized ? 'maximized' : 'true'}
    >
      <div className="mermaid-toolbar__controls">
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
          onClick={() => resetZoomTo(fitCanvasScale)}
          disabled={!canResetToFit}
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
      data-dragging={isDragging || undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
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
  );

  const inPageWrapper = (
    <div
      ref={inPageWrapperRef}
      className="mermaid-wrapper not-prose group/mermaid my-4"
      data-page-renderer
      data-hidden={isMaximized || undefined}
      aria-hidden={isMaximized || undefined}
    >
      {canvasOnly}
    </div>
  );

  const maximizedWrapper = (
    <div ref={wrapperRef} className="mermaid-wrapper not-prose group/mermaid my-4" data-maximized>
      {canvasOnly}
    </div>
  );

  const maximizedBackdrop = <div className="mermaid-maximized-backdrop" aria-hidden="true" />;

  if (mounted && svgContent && typeof document !== 'undefined') {
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
