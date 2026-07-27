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
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getPageDictionary } from '@/dictionaries';
import { useFitCanvasScale } from '@/lib/hooks/use-fit-canvas-scale';
import { useMermaidMaximize } from '@/lib/hooks/use-mermaid-maximize';
import { useMermaidRender } from '@/lib/hooks/use-mermaid-render';
import { useSvgViewBoxExpander } from '@/lib/hooks/use-svg-viewbox-expander';
import { useZoomAndPan } from '@/lib/hooks/use-zoom-and-pan';
import { resolveLocale } from '@/lib/i18n';

const TOOLBAR_BOTTOM_OFFSET = 12; // px from bottom edge of wrapper, matches bottom: 0.75rem

export function Mermaid({ chart }: { chart: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inPageWrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [toolbarStyle, setToolbarStyle] = useState<CSSProperties>({
    position: 'fixed',
    visibility: 'hidden',
  });

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

  const svgContent = useMermaidRender(chart, resolvedTheme === 'dark' ? 'dark' : 'default');
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

  // Sync the portaled toolbar position with the in-page wrapper.
  // Uses ResizeObserver + scroll + resize listeners so the toolbar stays
  // anchored to the bottom-center of the wrapper even during layout shifts.
  // The toolbar is hidden when the wrapper scrolls out of view.
  // 同步 Portal 工具栏与页面内 wrapper 的位置。
  // 使用 ResizeObserver + scroll + resize 监听，即使布局变化也能让工具栏
  // 始终锚定在 wrapper 底部居中。wrapper 滚出视口时工具栏隐藏。
  const updateToolbarPosition = useCallback(() => {
    const wrapperEl = inPageWrapperRef.current;
    const toolbarEl = toolbarRef.current;
    if (!wrapperEl || !toolbarEl) return;

    const wrapperRect = wrapperEl.getBoundingClientRect();

    // Hide toolbar if wrapper is completely off-screen
    if (
      wrapperRect.bottom < 0 ||
      wrapperRect.top > window.innerHeight ||
      wrapperRect.right < 0 ||
      wrapperRect.left > window.innerWidth
    ) {
      setToolbarStyle((prev) => ({ ...prev, visibility: 'hidden' }));
      return;
    }

    const toolbarWidth = toolbarEl.offsetWidth;

    // Horizontal: center-align with wrapper
    const left = wrapperRect.left + wrapperRect.width / 2 - toolbarWidth / 2;
    // Vertical: bottom of wrapper minus offset (matches original bottom: 0.75rem)
    const top = wrapperRect.bottom - TOOLBAR_BOTTOM_OFFSET - toolbarEl.offsetHeight;

    setToolbarStyle({
      position: 'fixed',
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
      visibility: 'visible',
    });
  }, []);

  useEffect(() => {
    if (!mounted || isMaximized) return;
    if (typeof document === 'undefined') return;

    // Initial position
    const raf = requestAnimationFrame(updateToolbarPosition);

    // Observe wrapper size changes
    const ro = new ResizeObserver(updateToolbarPosition);
    if (inPageWrapperRef.current) {
      ro.observe(inPageWrapperRef.current);
    }

    // Observe toolbar size changes (scale text change etc.)
    if (toolbarRef.current) {
      ro.observe(toolbarRef.current);
    }

    // Reposition on scroll (passive for performance) and window resize
    const handleScroll = () => updateToolbarPosition();
    const handleResize = () => updateToolbarPosition();

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    // Also listen for theme / layout transitions that might shift the wrapper
    // (e.g. sidebar toggle, search open). MutationObserver catches DOM changes
    // that affect layout; we debounce via rAF inside updateToolbarPosition.
    const mo = new MutationObserver(() => {
      requestAnimationFrame(updateToolbarPosition);
    });
    if (inPageWrapperRef.current?.parentElement) {
      mo.observe(inPageWrapperRef.current.parentElement, {
        subtree: false,
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'data-collapsed'],
      });
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [mounted, isMaximized, updateToolbarPosition]);

  const toolbar = (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label={labels.mermaidToolbar}
      className="mermaid-toolbar"
      style={isMaximized ? undefined : toolbarStyle}
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

  if (mounted && typeof document !== 'undefined') {
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
