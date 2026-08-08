// Mermaid diagram renderer with zoom / pan / reset / maximize controls and a
// render / code view toggle. Charts render through the shared idle-time
// scheduler (mermaid-render-scheduler) and re-render only when the chart
// source changes; theme colors update through CSS variables. Falls back to
// raw text on error.
// The floating toolbar stays inside the diagram wrapper in normal mode so it
// shares the wrapper's scroll position and stacking order. Only maximized mode
// portals it to document.body alongside the fullscreen diagram.
// Mermaid 图表渲染器（带缩放 / 拖动 / 重置 / 视口内放大控制与渲染 / 代码
// 视图切换）。图表由共享调度器在空闲时段渲染，仅在源码变化时重新渲染；
// 主题配色通过 CSS 变量更新。出错时回退为原始文本。普通模式下工具栏保留在
// 图表 wrapper 内，与图表共用滚动位置和层叠顺序；仅最大化模式随全屏图表
// Portal 到 document.body。

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
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { getPageDictionary } from '@/dictionaries';
import { useFitCanvasScale } from '@/lib/hooks/use-fit-canvas-scale';
import { useMermaidMaximize } from '@/lib/hooks/use-mermaid-maximize';
import { useMermaidRender } from '@/lib/hooks/use-mermaid-render';
import { useMermaidViewMode } from '@/lib/hooks/use-mermaid-view-mode';
import { DEFAULT_SCALE, ORIGIN, useZoomAndPan } from '@/lib/hooks/use-zoom-and-pan';
import { resolveLocale } from '@/lib/i18n';
import { promoteMermaidChart } from '@/lib/mermaid-render-scheduler';

// Promote the chart well before it enters the viewport so the reader reaches
// an already-rendered canvas: promotion only reorders the idle queue, and the
// wider margin gives the quiet reading pause before arrival time to finish it.
// 在图表进入视口前提前提升优先级，让读者到达时画布已就绪：提升只调整空闲
// 队列顺序，较宽的提前量给了到达前的阅读停顿足够时间完成渲染。
const MERMAID_RENDER_ROOT_MARGIN = '1200px 0px';
// Keep the wheel-zoom transition active briefly after the last wheel event so
// the final 140ms glide can finish before the default (longer) transitions
// resume. Without this buffer, switching transition durations mid-flight
// would cause a visible hitch at the end of a zoom burst.
// 最后一次滚轮事件后短暂保留滚轮过渡，使最后的 140ms 滑行能在默认（更长）
// 过渡恢复前完成。否则过渡时长在飞行中切换会在缩放 bursts 末尾造成可见顿挫。
const WHEEL_ZOOM_SETTLE_DELAY = 180;

type MaximizeTransitionPhase = 'idle' | 'measuring' | 'preparing' | 'entering' | 'exiting';

type MaximizeTransitionOrigin = {
  top: number;
  left: number;
  width: number;
  height: number;
  borderRadius: string;
  content: MaximizeTransitionRect | null;
};

type MaximizeTransitionRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function readTransitionRect(element: Element): MaximizeTransitionRect {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function readTransitionContentRect(wrapper: HTMLElement) {
  const content = wrapper.querySelector('.mermaid-svg-host');
  return content ? readTransitionRect(content) : null;
}

function readTransitionOrigin(element: HTMLElement): MaximizeTransitionOrigin {
  return {
    ...readTransitionRect(element),
    borderRadius: getComputedStyle(element).borderRadius,
    content: readTransitionContentRect(element),
  };
}

function getMaximizeTransitionStyle(
  origin: MaximizeTransitionOrigin,
  target: DOMRect,
  targetContent: MaximizeTransitionRect | null,
): CSSProperties {
  const canAlignContent =
    origin.content !== null &&
    targetContent !== null &&
    origin.content.width > 0 &&
    origin.content.height > 0 &&
    targetContent.width > 0 &&
    targetContent.height > 0;

  let scale: number;
  let translateX: number;
  let translateY: number;

  if (canAlignContent && origin.content && targetContent) {
    // Both SVG hosts share the same natural aspect ratio, so a single scale
    // aligns them without deforming the diagram. Position the transformed
    // fullscreen host directly over the preserved in-page host.
    // 两端 SVG host 具有相同自然宽高比，使用单一比例即可无变形对齐；平移量
    // 直接把变换后的全屏 host 覆盖到保留的页面内 host 上。
    scale = origin.content.width / targetContent.width;
    const scaledTargetLeft = target.left + (targetContent.left - target.left) * scale;
    const scaledTargetTop = target.top + (targetContent.top - target.top) * scale;
    translateX = origin.content.left - scaledTargetLeft;
    translateY = origin.content.top - scaledTargetTop;
  } else {
    // Code view and render fallbacks may not expose a measurable content box.
    // Use a centered uniform wrapper fit rather than stretching each axis.
    // 代码视图或回退内容可能没有可测量内容盒；此时使用居中的等比 wrapper
    // 适配，也不再分别拉伸两个方向。
    const scaleX = target.width > 0 ? origin.width / target.width : 1;
    const scaleY = target.height > 0 ? origin.height / target.height : 1;
    scale = Math.min(scaleX, scaleY);
    translateX = origin.left + (origin.width - target.width * scale) / 2 - target.left;
    translateY = origin.top + (origin.height - target.height * scale) / 2 - target.top;
  }

  return {
    '--mermaid-maximize-x': `${translateX}px`,
    '--mermaid-maximize-y': `${translateY}px`,
    '--mermaid-maximize-scale': scale,
    '--mermaid-maximize-origin-radius': origin.borderRadius,
  } as CSSProperties;
}

function addSharedShadowFilter(svgContent: string, filterId: string) {
  const openingTagEnd = svgContent.indexOf('>');
  if (openingTagEnd < 0) return svgContent;

  const filterDefinition =
    `<defs aria-hidden="true"><filter id="${filterId}" x="-50%" y="-50%" ` +
    'width="200%" height="200%"><feDropShadow class="mermaid-node-shadow" ' +
    'dx="0" dy="6.4" stdDeviation="12"></feDropShadow></filter></defs>';

  return `${svgContent.slice(0, openingTagEnd + 1)}${filterDefinition}${svgContent.slice(openingTagEnd + 1)}`;
}

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

// Pending-render placeholder shown while the scheduler renders the chart in
// a quiet moment: three centered silhouette bars with a subtle shimmer, no
// frame, no text, no interaction blocking. It must be a flex sibling of the
// zoom target (whose frame is 0x0 before the SVG arrives) so the canvas can
// center it. Pure decoration; the status role marks the pending state for
// assistive tech without an announcement.
// 图表仍在渲染时的占位：三条居中剪影条 + 柔和微光，无边框、无文字、
// 不阻塞交互。它必须是缩放目标（SVG 到达前外框为 0x0）的 flex 兄弟节点，
// 画布才能将其居中。纯装饰；status 角色仅向辅助技术标记待渲染状态，
// 不播报。
function MermaidSkeleton() {
  return (
    <div className="mermaid-skeleton" role="status" aria-live="polite">
      <div className="mermaid-skeleton__bars" aria-hidden="true">
        <span className="mermaid-skeleton__bar" />
        <span className="mermaid-skeleton__bar" />
        <span className="mermaid-skeleton__bar" />
      </div>
    </div>
  );
}

export function Mermaid({ chart }: { chart: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inPageWrapperRef = useRef<HTMLDivElement>(null);
  const inPageCanvasRef = useRef<HTMLDivElement>(null);
  const maximizedCanvasRef = useRef<HTMLDivElement>(null);
  const maximizeTransitionOriginRef = useRef<MaximizeTransitionOrigin>(null);
  const escapeRestorePendingRef = useRef(false);
  const interactionLockedRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [maximizeTransitionPhase, setMaximizeTransitionPhase] =
    useState<MaximizeTransitionPhase>('idle');
  const [maximizeTransitionStyle, setMaximizeTransitionStyle] = useState<CSSProperties>();

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

  // When the diagram approaches the viewport, it enters the shared render
  // queue ahead of any pending charts, so the one the reader is actually
  // reaching renders first. Far-away charts stay skeletons and never steal
  // render time. Rendering itself stays off the scroll path; this observer
  // only feeds the serialized pump.
  // 图表接近视口时将其加入共享渲染队列并放到队首，保证读者即将看到的图
  // 优先渲染；远处的图表保持骨架占位、不抢占渲染时间。渲染本身仍不占用
  // 滚动路径，此观察器只负责喂给串行渲染泵。
  useEffect(() => {
    const wrapper = inPageWrapperRef.current;
    if (!wrapper || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        promoteMermaidChart(chart);
        observer.disconnect();
      },
      { rootMargin: MERMAID_RENDER_ROOT_MARGIN },
    );
    observer.observe(wrapper);

    return () => observer.disconnect();
  }, [chart]);

  // Only render the SVG when the user is viewing the rendered diagram. Code
  // view can display the original source without keeping the heavyweight
  // renderer active; charts still pre-render in the background via the shared
  // scheduler when they approach the viewport.
  // 仅当用户处于渲染视图时才展示 SVG。代码视图可直接展示原始源码，无需
  // 让较重的渲染器持续运行；图表接近视口时仍由共享调度器在后台预渲染。
  const { svgContent, svgNatural, diagramType, renderFailed } = useMermaidRender(
    chart,
    viewMode === 'render',
  );
  // Keep the shared shadow definition inside the SVG that consumes it. A
  // separate zero-sized SVG can still paint its filter region in Chromium,
  // which showed up as a tiny dash near the canvas origin.
  // 将共享阴影定义放入实际使用它的 SVG。Chromium 仍可能绘制零尺寸独立 SVG
  // 的滤镜区域，之前因此会在画布原点附近出现一个短横块。
  const svgWithShadowFilter = useMemo(
    () => (svgContent ? addSharedShadowFilter(svgContent, filterId) : ''),
    [filterId, svgContent],
  );
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
    cancelInteraction,
    canZoomOut,
    canZoomIn,
  } = useZoomAndPan();
  const { isMaximized, inPageScale, inPagePan, maximize, restore } = useMermaidMaximize(
    scale,
    setScale,
    pan,
    setPan,
  );

  const handleMaximize = useCallback(() => {
    if (interactionLockedRef.current || isMaximized || maximizeTransitionPhase !== 'idle') return;

    escapeRestorePendingRef.current = false;
    const inPageWrapper = inPageWrapperRef.current;
    if (!inPageWrapper || prefersReducedMotion()) {
      maximize();
      return;
    }

    interactionLockedRef.current = true;
    cancelInteraction(inPageCanvasRef.current);
    maximizeTransitionOriginRef.current = readTransitionOrigin(inPageWrapper);
    setMaximizeTransitionPhase('measuring');
    maximize();
  }, [cancelInteraction, isMaximized, maximize, maximizeTransitionPhase]);

  const handleRestore = useCallback(() => {
    if (interactionLockedRef.current || !isMaximized || maximizeTransitionPhase !== 'idle') return;

    const inPageWrapper = inPageWrapperRef.current;
    const maximizedWrapper = wrapperRef.current;
    if (!inPageWrapper || !maximizedWrapper || prefersReducedMotion()) {
      restore();
      return;
    }

    interactionLockedRef.current = true;
    cancelInteraction(maximizedCanvasRef.current);
    const origin = readTransitionOrigin(inPageWrapper);
    maximizeTransitionOriginRef.current = origin;
    setMaximizeTransitionStyle(
      getMaximizeTransitionStyle(
        origin,
        maximizedWrapper.getBoundingClientRect(),
        readTransitionContentRect(maximizedWrapper),
      ),
    );
    setMaximizeTransitionPhase('exiting');
  }, [cancelInteraction, isMaximized, maximizeTransitionPhase, restore]);

  // The portaled SVG host must be measured after its fullscreen fit has settled.
  // Keep the original in-page renderer visible while the transparent portal is
  // measured, then align both SVG hosts for one painted frame before starting
  // the compositor-only transform. Complex SVGs therefore cannot consume the
  // animation's first frames while their portal copy is still being painted.
  // Portal SVG host 必须在全屏适配稳定后测量。透明 Portal 测量期间继续显示原图，
  // 随后让两端 SVG host 对齐并完整绘制一帧，再启动纯合成层 transform；这样复杂
  // SVG 不会在 Portal 副本仍在绘制时吃掉动画的前几帧。
  useEffect(() => {
    if (!isMaximized || maximizeTransitionPhase !== 'measuring') return;

    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        const inPageWrapper = inPageWrapperRef.current;
        const maximizedWrapper = wrapperRef.current;
        if (!inPageWrapper || !maximizedWrapper) {
          interactionLockedRef.current = false;
          setMaximizeTransitionPhase('idle');
          return;
        }

        const origin = readTransitionOrigin(inPageWrapper);
        maximizeTransitionOriginRef.current = origin;
        setMaximizeTransitionStyle(
          getMaximizeTransitionStyle(
            origin,
            maximizedWrapper.getBoundingClientRect(),
            readTransitionContentRect(maximizedWrapper),
          ),
        );
        setMaximizeTransitionPhase('preparing');
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, [isMaximized, maximizeTransitionPhase]);

  useEffect(() => {
    if (maximizeTransitionPhase !== 'preparing') return;

    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setMaximizeTransitionPhase('entering'));
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, [maximizeTransitionPhase]);

  useEffect(() => {
    if (!isMaximized) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (interactionLockedRef.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (event.key !== 'Escape') return;

      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.repeat || escapeRestorePendingRef.current || maximizeTransitionPhase !== 'idle') {
        return;
      }

      // Lock synchronously before React commits the exiting phase. Keyboard
      // auto-repeat and another document-level listener therefore cannot start
      // the same restore transition twice within one frame.
      // 在 React 提交 exiting 阶段前同步加锁，避免键盘自动重复或同层文档监听器
      // 在同一帧内再次启动恢复动画。
      escapeRestorePendingRef.current = true;
      handleRestore();
    };

    const blockTransitionScroll = (event: Event) => {
      if (!interactionLockedRef.current) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    document.addEventListener('keydown', handleEscape, true);
    document.addEventListener('wheel', blockTransitionScroll, { capture: true, passive: false });
    document.addEventListener('touchmove', blockTransitionScroll, {
      capture: true,
      passive: false,
    });
    return () => {
      document.removeEventListener('keydown', handleEscape, true);
      document.removeEventListener('wheel', blockTransitionScroll, true);
      document.removeEventListener('touchmove', blockTransitionScroll, true);
    };
  }, [handleRestore, isMaximized, maximizeTransitionPhase]);

  const handleMaximizeAnimationEnd = useCallback(
    (event: React.AnimationEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) return;

      if (
        maximizeTransitionPhase === 'entering' &&
        event.animationName === 'mermaid-maximized-wrapper-in'
      ) {
        interactionLockedRef.current = false;
        setMaximizeTransitionPhase('idle');
      } else if (
        maximizeTransitionPhase === 'exiting' &&
        event.animationName === 'mermaid-maximized-wrapper-out'
      ) {
        interactionLockedRef.current = false;
        setMaximizeTransitionPhase('idle');
        restore();
      }
    },
    [maximizeTransitionPhase, restore],
  );
  // The scheduler has already finalized the SVG dimensions and diagram type,
  // so fitting does not need to traverse the newly injected SVG subtree.
  // 调度器已完成 SVG 尺寸与图型归一化，适配阶段无需再遍历刚注入的 SVG 子树。
  const { inPageFitCanvasScale, maximizedFitCanvasScale, recomputeFitCanvasScale } =
    useFitCanvasScale(svgNatural, diagramType, inPageCanvasRef, maximizedCanvasRef, isMaximized);
  // Defer the per-node drop-shadow filter to the second frame after the SVG
  // arrives. The first frame paints the SVG without the filter, so the diagram
  // appears instantly instead of freezing while the browser rasterizes a
  // Gaussian-blur drop-shadow for every .node on the paint frame. The shadow
  // settles in on the next frame — imperceptible for a subtle accent-tinted
  // shadow, and the SVG geometry is already laid out by then so only the
  // filter rasterization runs. SVG filters are computed per-element on the CPU
  // (the <filter> definition is parsed once, but each .node that references it
  // is rasterized independently), so deferral removes the dominant paint-phase
  // cost from the first visible frame of complex diagrams.
  // 将逐节点 drop-shadow 滤镜推迟到 SVG 到达后的第二帧。第一帧绘制无滤镜的
  // SVG，使图表瞬时出现，而非在浏览器为首帧每个 .node 栅格化高斯模糊
  // drop-shadow 时冻结。阴影在下一帧落定 —— 对柔和的强调色阴影不可感知，
  // 且此时 SVG 几何已完成布局，仅运行滤镜栅格化。SVG 滤镜在 CPU 上逐元素
  // 计算（<filter> 定义仅解析一次，但每个引用它的 .node 独立栅格化），
  // 推迟将复杂图首帧的主要绘制阶段成本移出首个可见帧。
  const [shadowReady, setShadowReady] = useState(false);
  useLayoutEffect(() => {
    if (!svgContent) {
      setShadowReady(false);
      return;
    }
    // Reset synchronously before paint so the first visible frame carries no
    // per-node filter. When the previous SVG already applied the filter this
    // triggers one synchronous re-render (cheap — only a CSS variable changes).
    // 在绘制前同步重置，使首个可见帧不带逐节点滤镜。若上一个 SVG 已应用
    // 滤镜，此处触发一次同步重渲染（廉价——仅 CSS 变量变更）。
    setShadowReady(false);
    const raf = requestAnimationFrame(() => setShadowReady(true));
    return () => cancelAnimationFrame(raf);
  }, [svgContent]);

  // Reset restores logical zoom/pan and remeasures the active canvas. Keeping
  // it available at 100% also provides a recovery path after viewport changes.
  // 重置同时恢复逻辑缩放、平移并重新测量当前画布；即使显示为 100%，也保留
  // 操作入口，以便在视口变化后主动恢复适配。
  const handleResetZoom = useCallback(() => {
    if (interactionLockedRef.current) return;
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
  const getZoomStyle = (
    fitCanvasScale: number,
    logicalScale: number,
    logicalPan: { x: number; y: number },
  ) =>
    ({
      '--svg-w': `${svgNatural.width}px`,
      '--svg-h': `${svgNatural.height}px`,
      '--svg-frame-w': `${svgNatural.width * fitCanvasScale}px`,
      '--svg-frame-h': `${svgNatural.height * fitCanvasScale}px`,
      '--mermaid-scale': fitCanvasScale * logicalScale,
      '--mermaid-pan-x': `${logicalPan.x}px`,
      '--mermaid-pan-y': `${logicalPan.y}px`,
      // Pass the instance-scoped filter id to CSS so .node elements can reference
      // the shared SVG filter via var(--mermaid-node-shadow-filter). Set to 'none'
      // on the first frame (shadowReady = false) to skip per-node filter
      // rasterization until the SVG is already laid out; the rAF in the
      // useLayoutEffect above flips this to the filter url on the next frame.
      // 将实例作用域的滤镜 id 传给 CSS，使 .node 元素可通过
      // var(--mermaid-node-shadow-filter) 引用共享 SVG 滤镜。首帧
      // (shadowReady = false) 设为 'none' 以跳过逐节点滤镜栅格化，直到 SVG
      // 完成布局；上方 useLayoutEffect 中的 rAF 在下一帧将其切换为滤镜 url。
      '--mermaid-node-shadow-filter': shadowReady ? `url(#${filterId})` : 'none',
    }) as CSSProperties;

  // The toolbar is visible whenever there is rendered SVG OR the user is in
  // code view (where the toggle + maximize buttons are still needed).
  // 工具栏在有渲染 SVG 或用户处于代码视图（仍需切换 + 放大按钮）时可见。
  const toolbarVisible = mounted && (Boolean(svgContent) || viewMode === 'code');
  const isInteractionLocked = maximizeTransitionPhase !== 'idle';

  // Keyboard shortcut: press 'v' while the wrapper is focused to toggle
  // between render and code view. Ignored when typing in the textarea so the
  // character is inserted normally. Modifier keys (Ctrl/Meta/Alt) are also
  // excluded to avoid clashing with browser shortcuts.
  // 键盘快捷键：聚焦 wrapper 后按 'v' 在渲染 / 代码视图间切换。
  // 在文本域中输入时忽略，使字符正常插入。同时排除修饰键（Ctrl/Meta/Alt），
  // 避免与浏览器快捷键冲突。
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (interactionLockedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
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
      if (interactionLockedRef.current) return;

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

  const renderToolbar = (portaled: boolean) => (
    <div
      role="toolbar"
      aria-label={labels.mermaidToolbar}
      className="mermaid-toolbar"
      data-portaled={portaled ? 'maximized' : undefined}
      data-transition={portaled ? maximizeTransitionPhase : undefined}
      data-interaction-locked={isInteractionLocked || undefined}
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
            onClick={() => {
              if (!interactionLockedRef.current) setViewMode('render');
            }}
            disabled={isInteractionLocked}
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
            onClick={() => {
              if (!interactionLockedRef.current) setViewMode('code');
            }}
            disabled={isInteractionLocked}
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
            onClick={() => {
              if (!interactionLockedRef.current) zoomOut();
            }}
            disabled={isInteractionLocked || !canZoomOut || viewMode === 'code'}
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
            onClick={() => {
              if (!interactionLockedRef.current) zoomIn();
            }}
            disabled={isInteractionLocked || !canZoomIn || viewMode === 'code'}
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
            disabled={isInteractionLocked || !canResetZoom || viewMode === 'code'}
            aria-label={labels.mermaidReset}
            className="mermaid-toolbar__btn"
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            type="button"
            onClick={isMaximized ? handleRestore : handleMaximize}
            disabled={isInteractionLocked}
            aria-label={isMaximized ? labels.mermaidRestore : labels.mermaidMaximize}
            className="mermaid-toolbar__btn"
          >
            {isMaximized ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  );

  const handleCanvasPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (interactionLockedRef.current) {
        event.preventDefault();
        return;
      }
      handlePointerDown(event);
    },
    [handlePointerDown],
  );

  const handleCanvasPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (interactionLockedRef.current) {
        event.preventDefault();
        return;
      }
      handlePointerMove(event);
    },
    [handlePointerMove],
  );

  const handleCanvasPointerEnd = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (interactionLockedRef.current) {
        event.preventDefault();
        return;
      }
      endDrag(event);
    },
    [endDrag],
  );

  const renderCanvas = (
    activeCanvasRef: RefObject<HTMLDivElement | null>,
    fitCanvasScale: number,
    logicalScale: number,
    logicalPan: { x: number; y: number },
    includeRenderedSvg = true,
  ) => (
    <div
      ref={activeCanvasRef}
      className="mermaid-canvas"
      data-view={viewMode}
      data-dragging={isDragging || undefined}
      onPointerDown={viewMode === 'render' ? handleCanvasPointerDown : undefined}
      onPointerMove={viewMode === 'render' ? handleCanvasPointerMove : undefined}
      onPointerUp={viewMode === 'render' ? handleCanvasPointerEnd : undefined}
      onPointerCancel={viewMode === 'render' ? handleCanvasPointerEnd : undefined}
    >
      {/* Only the active view is rendered. Switching mounts the new view, which
         triggers a simple fade-in CSS animation. This avoids the cross-fade
         flicker that occurred when both layers were simultaneously visible.
         仅渲染激活视图。切换时挂载新视图，触发 CSS 淡入动画。
         避免两个视图层同时可见时交叉淡入淡出的闪烁。 */}
      {viewMode === 'render' ? (
        <>
          {/* Pending and failed charts live outside the zoom target, whose
             frame stays 0x0 until the SVG arrives: the skeleton / source
             fallback must be a flex sibling so the canvas can center it.
             The fallback prints the raw chart source when rendering failed
             so authors can inspect it.
             待渲染与渲染失败的图表放在缩放目标外侧 —— 目标在 SVG 到达前
             始终是 0x0 外框，骨架屏 / 源码回退必须作为 flex 兄弟节点才能
             被画布居中。渲染失败时回退打印原始源码，方便作者自查。 */}
          {includeRenderedSvg && !svgContent ? (
            renderFailed ? (
              <pre className="mermaid-fallback">{chart}</pre>
            ) : (
              <MermaidSkeleton />
            )
          ) : null}
          <div
            className="mermaid-zoom-target"
            style={getZoomStyle(fitCanvasScale, logicalScale, logicalPan)}
          >
            {svgContent ? (
              <div
                className="mermaid-svg-host"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG markup is generated by mermaid from the page's own chart source, not untrusted input.
                dangerouslySetInnerHTML={{
                  __html: includeRenderedSvg ? svgWithShadowFilter : '',
                }}
              />
            ) : null}
          </div>
        </>
      ) : (
        <MermaidCodeView
          chart={chart}
          codeViewLabel={labels.mermaidSourceCode}
          renderedDiagramHeight={svgNatural.height * fitCanvasScale}
        />
      )}
    </div>
  );

  const isRestoring = isMaximized && maximizeTransitionPhase === 'exiting';
  // Keep exactly one Mermaid SVG in the document. During the measurement
  // phase the visible in-page renderer owns it while the fullscreen host keeps
  // only an identically sized empty box. Preparing atomically hands the SVG to
  // the portal, preventing duplicate marker ids from hiding arrowheads.
  // 文档中始终只保留一份 Mermaid SVG。测量阶段由可见的页面渲染器持有它，
  // 全屏 host 仅保留同尺寸空盒；进入 preparing 时一次性交给 Portal，避免重复
  // marker id 导致箭头消失。
  const renderInPageSvg = !isMaximized || maximizeTransitionPhase === 'measuring';
  const renderMaximizedSvg = maximizeTransitionPhase !== 'measuring';

  const inPageWrapper = (
    <div
      ref={inPageWrapperRef}
      className="mermaid-wrapper not-prose group/mermaid my-4"
      data-page-renderer
      data-rendered={svgContent ? '' : undefined}
      data-hidden={
        (isMaximized && maximizeTransitionPhase !== 'measuring' && !isRestoring) || undefined
      }
      data-restoring={isRestoring || undefined}
      data-interaction-locked={isInteractionLocked || undefined}
      aria-hidden={(isMaximized && maximizeTransitionPhase !== 'measuring') || undefined}
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
      {renderCanvas(inPageCanvasRef, inPageFitCanvasScale, inPageScale, inPagePan, renderInPageSvg)}
      {toolbarVisible && (!isMaximized || isRestoring) ? renderToolbar(false) : null}
    </div>
  );

  const maximizedWrapper = (
    // biome-ignore lint/a11y/noStaticElementInteractions: The maximized wrapper is intentionally focusable to support the 'v' keyboard shortcut for toggling views.
    <div
      ref={wrapperRef}
      className="mermaid-wrapper not-prose group/mermaid my-4"
      data-maximized
      data-transition={maximizeTransitionPhase}
      data-interaction-locked={isInteractionLocked || undefined}
      style={maximizeTransitionStyle}
      tabIndex={isMaximized ? 0 : -1}
      onKeyDown={handleKeyDown}
      onAnimationEnd={handleMaximizeAnimationEnd}
    >
      {renderCanvas(maximizedCanvasRef, maximizedFitCanvasScale, scale, pan, renderMaximizedSvg)}
    </div>
  );

  const maximizedBackdrop = (
    <div
      className="mermaid-maximized-backdrop"
      data-transition={maximizeTransitionPhase}
      aria-hidden="true"
    />
  );

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
        {createPortal(renderToolbar(true), document.body)}
      </>
    );
  }
  return inPageWrapper;
}
