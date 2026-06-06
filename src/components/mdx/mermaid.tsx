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
  useLayoutEffect,
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
// Default zoom: render the diagram at its natural (1:1) size. Earlier
// iterations used a fit-to-view calculation that crushed large diagrams
// down to a tiny scale (height-axis-bound) and shrank everything to
// the minimum, making the toolbar look out of proportion and the
// diagram hard to read. With a fixed 1.0 default the diagram is always
// rendered at its true size; oversized diagrams remain scrollable via
// the canvas's overflow: auto and can be zoomed out manually if
// needed. The reset button returns to this default.
// 默认缩放：以图表原始 1:1 尺寸渲染。早期版本使用 fit-to-view
// 计算（受高度方向限制），会把大型图表压到很小的缩放，工具栏比例
// 失调、图表难以阅读。固定 1.0 默认后，图表始终按真实尺寸渲染；
// 过大的图表通过画布的 overflow: auto 滚动，也可以手动缩小。
// 重置按钮回到该默认值。
const DEFAULT_SCALE = 1;

// Pan origin. The zoom target starts centered; we keep this as a const so the
// reset logic and initial state stay in sync.
// 平移原点。缩放目标初始居中；用常量保持与重置逻辑一致。
const ORIGIN = { x: 0, y: 0 };

// Fit-viewport breathing room: how much we leave around the diagram when
// computing the scale that fits it inside the maximized viewport.
// The maximized canvas is now full-viewport (100vw × 100vh) with
// 1.5rem padding on each side, so total horizontal/vertical chrome =
// 2 * 1.5rem = 3rem = 48px. This MUST match the actual canvas size
// in mermaid.css (`.mermaid-wrapper[data-maximized] .mermaid-canvas`)
// — if the constants drift from the CSS, the fit scale will over- or
// under-shoot the canvas and the diagram's edges get clipped. The
// toolbar additionally takes ~72px from the bottom (0.75rem offset
// + ~28px chip height + 1.5rem bottom padding).
// fit-viewport 留白：计算放大视口下图表适配缩放时四周留出的空间。
// 放大态 canvas 现在撑满视口（100vw × 100vh），四边 1.5rem 内边距，
// 横向/纵向 chrome 总量 = 2 * 1.5rem = 3rem = 48px。此值必须与
// mermaid.css 中 `.mermaid-wrapper[data-maximized] .mermaid-canvas`
// 的实际尺寸保持一致 —— 常量与 CSS 漂移会让 fit 算出的缩放过大或
// 过小，图表边缘被裁掉。工具栏还要从底部再占 ~72px（0.75rem 偏移
// + ~28px 高度 + 1.5rem 底部内边距）。
const VIEWPORT_FIT_PADDING = 48;
const VIEWPORT_FIT_TOOLBAR_GAP = 72;

export function Mermaid({ chart }: { chart: string }) {
  // `wrapperRef` wraps the diagram; the wrapper is portaled to <body> when
  // maximized so the position: fixed layout escapes ancestor stacking
  // contexts (e.g. docs-transition's will-change: transform) that would
  // otherwise pin the fixed box to the docs column.
  // `wrapperRef` 包裹整个图表；放大时通过 portal 挂到 <body> 下，
  // 避免被祖先的 will-change: transform 等包含块限定在文档列内。
  const wrapperRef = useRef<HTMLDivElement>(null);
  // `inPageWrapperRef` points to the always-rendered in-page wrapper so
  // we can query the rendered SVG's intrinsic viewBox dimensions (the
  // portal clone only exists while maximized, so we always measure
  // from the in-flow one).
  // inPageWrapperRef 指向始终渲染的 in-page wrapper，用于读取
  // 已渲染 SVG 的 viewBox 内在尺寸（portal 克隆仅在放大时存在，
  // 所以始终从 in-flow 节点测量）。
  const inPageWrapperRef = useRef<HTMLDivElement>(null);
  // `canvasRef` points to the `.mermaid-canvas` element so we can measure
  // its actual rendered size and compute the largest scale at which the
  // diagram fits inside it. The in-page canvas and the maximized canvas
  // are both the same DOM element (the canvas is rendered in both the
  // in-page wrapper and the portaled maximize clone), so a single ref
  // reading at click time is enough — no need to keep two refs in sync.
  // canvasRef 指向 `.mermaid-canvas` 元素，用于测量它的实际渲染
  // 尺寸并计算图表能放进画布的最大缩放。in-page canvas 和放大版
  // canvas 是同一个 DOM 元素（canvas 在 in-page wrapper 和 portal 克
  // 隆里都渲染），单个 ref 在点击时读取即可 —— 不需要维护两个 ref
  // 的同步。
  const canvasRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  // `preMaximizeScaleRef` stores the user's scale right before entering
  // maximize, so exiting can restore it. The user's intentional zoom
  // (e.g. they zoomed to 150% before clicking maximize) is preserved
  // across a maximize / minimize round-trip — without this, exiting
  // maximize would always snap to DEFAULT_SCALE and silently wipe out
  // the user's zoom.
  // preMaximizeScaleRef 保存进入放大前的用户缩放，退出时恢复。
  // 不存的话，退出放大时一定会回弹到 DEFAULT_SCALE，把用户之前
  // 主动的缩放（例如放大到 150%）静默清掉。
  const preMaximizeScaleRef = useRef<number>(DEFAULT_SCALE);
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
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [pan, setPan] = useState(ORIGIN);
  const [isDragging, setIsDragging] = useState(false);
  // `fitCanvasScale` is the largest scale at which the diagram fits
  // inside the current canvas (in-page or maximized) without overflow.
  // `zoomIn` uses it as a hard cap so clicking the zoom-in button can
  // never push the diagram past the canvas's visible edges — the
  // "click zoom should not overflow" contract the user wants. It
  // re-derives on every render where the canvas size or the SVG's
  // natural size could have changed (mount, SVG content update,
  // maximize toggle, window resize).
  // fitCanvasScale 是图表在当前画布（in-page 或放大态）内不溢出
  // 的最大缩放。`zoomIn` 把它当作硬上限，确保点击放大按钮不会让
  // 图表超出画布可见边缘 —— 这是用户要求的"点击放大不应溢出"契
  // 约。它在画布尺寸或 SVG 内在尺寸可能变化的每次 render 时重算
  // （挂载、SVG 内容更新、放大态切换、窗口 resize）。
  const [fitCanvasScale, setFitCanvasScale] = useState(MAX_SCALE);
  // `isMaximized` is the page-level maximize flag (NOT the browser
  // Fullscreen API) — it pins the diagram to the viewport inside the page
  // and is exited via the toolbar button, the Escape key, or by re-clicking
  // maximize after returning to flow.
  // isMaximized 是页面级"放大铺满视口"标志（不是浏览器 Fullscreen API），
  // 可通过工具栏按钮、Esc 键或再次点击放大按钮退出。
  const [isMaximized, setIsMaximized] = useState(false);
  // `svgNatural` records the SVG's intrinsic viewBox dimensions so the
  // zoom target can compute its *layout* size (width/height) from
  // `svgW * scale × svgH * scale`. Without this, `transform: scale()`
  // only scales the visual and the canvas would still see the unscaled
  // natural size — leaving the diagram at its natural size and
  // pushing it off-center.
  // svgNatural 记录 SVG 内在 viewBox 尺寸，让 zoom-target 能算出
  // *布局* 尺寸（svgW*scale × svgH*scale）。否则 transform: scale()
  // 只缩视觉不缩布局，画布看到的仍是未缩放原始尺寸，图表维持
  // 原始尺寸并被挤偏。
  const [svgNatural, setSvgNatural] = useState({ width: 0, height: 0 });
  // `expandedViewBoxRef` stores the *expanded* viewBox string (and the
  // matching natural width/height) computed from a real content bbox
  // walk. Mermaid's reported viewBox is often slightly smaller than
  // the actual drawn extent (strokes, edge labels, arrow heads land
  // outside the reported box), so we recompute it from the live DOM
  // and re-write it onto the SVG. The ref is the source of truth for
  // the no-dependency layout effect below: React replaces the SVG
  // element on every parent re-render (the dangerouslySetInnerHTML
  // div is re-applied), which would otherwise wipe our viewBox back
  // to mermaid's original value on each setState (e.g. zoom, pan,
  // maximize). The ref survives re-renders, and the no-dependency
  // effect re-applies it after every commit so the displayed viewBox
  // is always the expanded one — the layout effect with [svgContent]
  // alone is not enough because it only runs when svgContent changes,
  // not when React replaces the SVG node.
  // expandedViewBoxRef 存放由真实内容 bbox 计算出的"扩大后" viewBox
  // 字符串（以及对应的自然宽高）。mermaid 报告的 viewBox 经常小于实
  // 际绘制范围（stroke、边缘 label、箭头头部会落在报告框外），所以
  // 我们从实时 DOM 重新计算并写回 SVG。该 ref 是下方"无依赖" layout
  // effect 的唯一真源：React 会在每次父组件重渲染时替换 SVG 元素
  // （dangerouslySetInnerHTML div 被重新应用），否则我们写入的
  // viewBox 会在每次 setState（缩放、平移、放大）后被 mermaid 原值覆
  // 盖。ref 跨渲染存活，无依赖 effect 在每次 commit 后重新写入，保证
  // 显示的 viewBox 始终是扩大后的——单靠 [svgContent] 的 layout
  // effect 不够，因为它只在 svgContent 变化时跑，不在 React 替换
  // SVG 节点时跑。
  const expandedViewBoxRef = useRef<{
    viewBox: string;
    width: number;
    height: number;
  } | null>(null);
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

  // ── Fit-to-view scale / 自适应缩放 ────────────────────────────────
  // (Removed in favor of a fixed DEFAULT_SCALE — see the constant above
  // for the rationale. We still need the SVG's intrinsic viewBox
  // dimensions so the zoom target can lay itself out at
  // `svgW * scale × svgH * scale`; the fit-to-view computation itself
  // is no longer used.
  // 已弃用 fit-to-view，改用固定的 DEFAULT_SCALE（理由见上方常量）。
  // 仍需要 SVG 内在 viewBox 尺寸，让 zoom 目标按
  // svgW*scale × svgH*scale 布局；fit-to-view 计算本身不再使用。)

  // Once the SVG has been injected by the chart-render effect, capture
  // the SVG's *actual* content extent (not just the reported viewBox)
  // so the zoom target can lay itself out correctly. Mermaid's reported
  // viewBox is often slightly smaller than the real content extent:
  //   - `svg.getBBox()` only includes fill geometry, not strokes, so the
  //     outline of every node (and arrow heads) is cropped at the viewBox
  //     edge. The "开始" / "结束" nodes of a flowchart are typical
  //     casualties — the top stroke of the topmost node and the bottom
  //     stroke of the bottommost node get clipped against the viewBox.
  //   - Some chart types position edge labels or arrow heads outside the
  //     reported viewBox, so individual children can have a bbox that
  //     extends past the parent's bbox.
  // To get a faithful "what's actually drawn" extent, walk every
  // SVGGraphicsElement descendant and union their bboxes. Then add a
  // small safety padding (in user units) so the stroke never lands on
  // the viewBox edge. Apply that union back as the new viewBox, and use
  // its dimensions for `svgNatural` so `computeFitViewportScale` and
  // the zoom-target layout match what's actually painted.
  // `useLayoutEffect` runs after the DOM commit but before paint, so the
  // user never sees a flash at the original (cropped) viewBox size.
  // 当图表 effect 把 SVG 写入 DOM 后，记录 SVG 实际内容范围（不仅
  // 仅是 viewBox 报告值），让 zoom 目标按真实尺寸布局。mermaid 报
  // 告的 viewBox 经常比真实内容小：
  //   - `svg.getBBox()` 只包含 fill 几何，不包含 stroke，所以每个节
  //     点的轮廓和箭头头部都会被 viewBox 边缘裁掉。流程图的"开
  //     始" / "结束" 节点是典型受害者 —— 顶部节点的上 stroke 和
  //     底部节点的下 stroke 会被 viewBox 裁掉。
  //   - 一些图表类型会把边缘 label 或箭头定位在 viewBox 外，导致某
  //     些子元素的 bbox 超出父元素的 bbox。
  // 为了获得忠实的"实际绘制"范围，遍历每个 SVGGraphicsElement 子
  // 元素取 bbox 并集。然后加一点安全 padding（用户单位），让 stroke
  // 不会落在 viewBox 边缘。把并集写回 viewBox，并用它的尺寸作为
  // `svgNatural`，这样 `computeFitViewportScale` 和 zoom-target 的
  // 布局都和真实绘制保持一致。useLayoutEffect 在 DOM commit 之后、
  // 浏览器绘制之前同步执行，避免先以原始（裁剪过的）尺寸闪一帧。
  useLayoutEffect(() => {
    if (!svgContent) return;
    const wrapper = inPageWrapperRef.current;
    if (!wrapper) return;
    const svg = wrapper.querySelector<SVGSVGElement>('.mermaid-svg-host > svg');
    if (!svg) return;
    const vb = svg.viewBox.baseVal;
    // Safety padding in user units, applied to every side of the union
    // bbox. Mermaid diagrams use SVG `<filter>` elements for drop
    // shadows (e.g. `width="130%" height="130%"`), which means the
    // shadow can extend well beyond the element's fill bbox — a
    // `feDropShadow dx=2 dy=4 stdDeviation=4` can reach ~16 user
    // units past the bbox edge. 8 units only covered the stroke
    // itself; 16 covers the shadow + stroke + a small margin.
    // 安全 padding（用户单位），加在并集 bbox 的每一边。Mermaid
    // 图表使用 SVG `<filter>` 元素实现投影（如 `width="130%"
    // height="130%"`），阴影可远超元素 fill bbox ——
    // `feDropShadow dx=2 dy=4 stdDeviation=4` 最远可达 ~16 用户
    // 单位。8 仅够 stroke；16 覆盖阴影 + stroke + 少量边距。
    const BBOX_PADDING = 16;
    let minX = vb.x;
    let minY = vb.y;
    let maxX = vb.x + vb.width;
    let maxY = vb.y + vb.height;
    // Walk every SVGGraphicsElement descendant and union their bboxes.
    // We collect into the outer `minX / minY / maxX / maxY` so a single
    // traversal tells us the full content extent. The walk is safe even
    // when getBBox() throws on a detached node (we catch and continue).
    // 遍历每个 SVGGraphicsElement 子元素取 bbox 并集。统一收集到外
    // 层的 minX/minY/maxX/maxY，单次遍历就能拿到完整内容范围。即
    // 使 getBBox() 在 detached 节点上抛错也安全（catch 后继续）。
    const collectBBox = (el: Element) => {
      if (el instanceof SVGGraphicsElement) {
        try {
          const b = el.getBBox();
          if (
            Number.isFinite(b.x) &&
            Number.isFinite(b.y) &&
            Number.isFinite(b.width) &&
            Number.isFinite(b.height) &&
            b.width >= 0 &&
            b.height >= 0
          ) {
            if (b.x < minX) minX = b.x;
            if (b.y < minY) minY = b.y;
            if (b.x + b.width > maxX) maxX = b.x + b.width;
            if (b.y + b.height > maxY) maxY = b.y + b.height;
          }
        } catch {
          // getBBox can throw on detached / not-yet-rendered elements;
          // safe to skip and let the rest of the walk fill in the bbox.
          // getBBox 在未挂载/未渲染的元素上可能抛错；跳过即可，让其
          // 他遍历补全 bbox。
        }
      }
      for (const child of Array.from(el.children)) {
        collectBBox(child);
      }
    };
    try {
      collectBBox(svg);
    } catch {
      // Defensive: if the walk itself throws for any reason, fall back
      // to the reported viewBox below.
      // 兜底：遍历本身如有任何异常，按下面 viewBox 报告值回退。
    }
    const paddedMinX = minX - BBOX_PADDING;
    const paddedMinY = minY - BBOX_PADDING;
    const paddedMaxX = maxX + BBOX_PADDING;
    const paddedMaxY = maxY + BBOX_PADDING;
    const expandedW = paddedMaxX - paddedMinX;
    const expandedH = paddedMaxY - paddedMinY;
    if (expandedW > 0 && expandedH > 0) {
      // Write the expanded viewBox back to the SVG so the diagram is
      // rendered into a viewport that actually contains every stroke.
      // Re-setting the same viewBox is a no-op, so the cost is just one
      // attribute write on the rare cases where mermaid already gave us
      // a perfect viewBox.
      // 把扩大后的 viewBox 写回 SVG，让图表渲染到一个真正包含每个
      // stroke 的视口中。如果 viewBox 没变则 setAttribute 实质是 no-
      // op，mermaid 本身就给我们完美 viewBox 的情况下只多一次属性
      // 写入。
      const viewBox = `${paddedMinX} ${paddedMinY} ${expandedW} ${expandedH}`;
      svg.setAttribute('viewBox', viewBox);
      // Mermaid inlines `max-width: <reported viewBox width>px` on the
      // SVG so it doesn't overflow its reported natural size. After we
      // expand the viewBox that cap no longer matches the actual
      // drawing extent and silently shrinks the rendered diagram to
      // the original (smaller) viewBox dimensions. Strip the cap so
      // the SVG honors the new (larger) viewBox; the parent
      // `.mermaid-zoom-target` already constrains the layout size
      // via `--svg-w` / `--svg-h`, so the SVG can't escape the canvas.
      // mermaid 在 SVG 上内联 `max-width: <报告 viewBox 宽度>px`，
      // 防止超过报告的"自然"尺寸。我们扩大 viewBox 后这个上限就
      // 跟实际绘制范围对不上了，会把图表静默压回原 viewBox 尺寸。
      // 去掉这个上限，SVG 才会按新（更大的）viewBox 渲染；外层
      // `.mermaid-zoom-target` 已经通过 `--svg-w` / `--svg-h` 锁
      // 住了 layout 尺寸，SVG 不会超出画布。
      svg.style.removeProperty('max-width');
      svg.style.removeProperty('max-height');
      // Stash the result so the no-dependency layout effect below can
      // re-apply it after React replaces the SVG node on a subsequent
      // re-render (the [svgContent]-scoped effect only fires when
      // svgContent changes, not when the parent re-renders for
      // unrelated reasons like zoom / pan / maximize).
      // 把结果存到 ref，下方"无依赖"的 layout effect 会在 React
      // 后续重渲染（与 svgContent 无关的 zoom / pan / 放大等）
      // 替换 SVG 节点后重新写入。
      expandedViewBoxRef.current = { viewBox, width: expandedW, height: expandedH };
      setSvgNatural({ width: expandedW, height: expandedH });
    } else if (vb.width > 0 && vb.height > 0) {
      // Degenerate case: nothing to expand. Use the reported viewBox as
      // a safe baseline so we never end up with a 0×0 layout.
      // 退化情况：没有可扩展的内容。退回 viewBox 报告值，保证 layout
      // 至少不是 0×0。
      expandedViewBoxRef.current = {
        viewBox: `${vb.x} ${vb.y} ${vb.width} ${vb.height}`,
        width: vb.width,
        height: vb.height,
      };
      setSvgNatural({ width: vb.width, height: vb.height });
    }
  }, [svgContent]);

  // Re-apply the expanded viewBox (and strip mermaid's max-width cap)
  // on every commit. React replaces the SVG element on each parent
  // re-render (the dangerouslySetInnerHTML div is re-applied even when
  // the underlying `__html` string is unchanged — the props object
  // identity changes), so the [svgContent]-scoped layout effect above
  // — which only fires when svgContent changes — is not enough: any
  // setState (zoom, pan, maximize, theme) would wipe the viewBox back
  // to mermaid's original (smaller) value and the diagram would clip
  // its strokes again. This effect runs after every commit, reads the
  // stored viewBox from the ref, and writes it onto whatever SVG node
  // is currently in the DOM. The ref is `null` until the first
  // [svgContent] effect runs, so the early return below is a no-op on
  // the first render(s) before the diagram is mounted.
  // 每次 commit 后重新写入扩大后的 viewBox（并去掉 mermaid 的
  // max-width 上限）。React 会在每次父组件重渲染时替换 SVG 元素
  // （dangerouslySetInnerHTML div 会被重新应用，即使底层 __html
  // 字符串未变 —— props 对象的引用变了），所以上面那个依赖
  // [svgContent] 的 layout effect 不够：任何 setState（缩放、平
  // 移、放大、主题）都会把 viewBox 重置回 mermaid 原值，图表 stroke
  // 又被裁掉。本 effect 在每次 commit 后跑，从 ref 读取存好的
  // viewBox，写到当前 DOM 里的 SVG 上。ref 在第一次 [svgContent]
  // effect 跑完前为 null，所以下面的提前返回在图表挂载前的初次
  // render 里是 no-op。
  useLayoutEffect(() => {
    const stored = expandedViewBoxRef.current;
    if (!stored) return;
    // Re-apply on every SVG that is currently in the DOM. There are
    // two render sites for the same canvas subtree: the always-mounted
    // in-page wrapper (`inPageWrapperRef`) and, while maximized, the
    // portaled clone (`wrapperRef`). React replaces the SVG on each
    // parent re-render in BOTH trees, so we have to write the expanded
    // viewBox (and strip the mermaid max-width cap) onto each one
    // independently. The in-page wrapper is the measurement source
    // and is always present; the maximized clone only exists when
    // `isMaximized` is true, so its ref is null otherwise and we skip
    // it. Skipping a null ref is safe — the query would just return
    // null and the early return handles it.
    // 每个当前在 DOM 里的 SVG 都要重新写入。同一份 canvas 子树有两个
    // 渲染点：始终挂载的 in-page wrapper（`inPageWrapperRef`），以及
    // 放大态下的 portal 克隆（`wrapperRef`）。React 会在每次父组件
    // 重渲染时替换两棵子树里的 SVG，所以扩大后的 viewBox（以及去掉
    // mermaid max-width 上限）必须分别写到两份上。in-page wrapper 是
    // 测量源、始终在；放大克隆只在 `isMaximized` 为真时存在，否则 ref
    // 为 null 直接跳过。跳过 null ref 是安全的——querySelector 只会
    // 返回 null，下面的早返回会处理。
    const wrappers: (HTMLDivElement | null)[] = [
      inPageWrapperRef.current,
      wrapperRef.current,
    ];
    for (const wrapper of wrappers) {
      if (!wrapper) continue;
      const svg = wrapper.querySelector<SVGSVGElement>('.mermaid-svg-host > svg');
      if (!svg) continue;
      if (svg.getAttribute('viewBox') !== stored.viewBox) {
        svg.setAttribute('viewBox', stored.viewBox);
      }
      // Strip the inline max-width / max-height cap on every commit;
      // React re-injects them on each dangerouslySetInnerHTML pass
      // (they come from the original svgContent string), so we have to
      // remove them again after the replacement.
      // 每次 commit 都清掉内联 max-width / max-height 上限；React
      // 会在每次 dangerouslySetInnerHTML 重新应用时把它们再注入
      // （它们来自原始 svgContent 字符串），所以每次替换后都要再
      // 清一次。
      if (svg.style.maxWidth) svg.style.removeProperty('max-width');
      if (svg.style.maxHeight) svg.style.removeProperty('max-height');
      // Set `overflow: visible` on the SVG so that filter outputs
      // (drop shadows) that extend beyond the viewBox are not
      // clipped. The default SVG overflow is `hidden`, which clips
      // filter output at the viewBox boundary. Mermaid's drop-shadow
      // filters (e.g. `width="130%" height="130%"`) can extend well
      // past the element's fill bbox; even with our expanded viewBox
      // and 16-unit padding, the far edge of a blur halo can still
      // land outside the box. `overflow: visible` lets the shadow
      // paint freely; the parent `.mermaid-zoom-target` still clips
      // at its layout boundary so the shadow doesn't push the canvas
      // around.
      // 给 SVG 设 `overflow: visible`，让 filter 输出（投影）不被
      // viewBox 边界裁剪。SVG 默认 overflow 为 hidden，会把 filter
      // 输出裁到 viewBox 内。mermaid 的投影 filter（如
      // `width="130%" height="130%"`）可远超元素 fill bbox；即使
      // viewBox 已扩大并加了 16 单位 padding，模糊光晕的远端仍可能
      // 落在框外。`overflow: visible` 让阴影自由绘制；外层
      // `.mermaid-zoom-target` 仍会在其布局边界处裁剪，阴影不会把
      // 画布撑大。
      svg.style.overflow = 'visible';
    }
  });

  // Compute the largest scale at which the diagram fits inside the
  // current canvas without overflow. Reads the canvas's actual rendered
  // size (subtracting the canvas's own padding so the diagram is sized
  // to the visible content area, not the wrapper chrome), then divides
  // by the SVG's natural size. Returns MAX_SCALE when the canvas or
  // SVG isn't measured yet (so the cap is effectively disabled during
  // the first render and zoom-in works as before until the next
  // recompute lands).
  // 计算图表在当前画布内不溢出的最大缩放。读取画布实际渲染尺寸
  // （减去画布自身的内边距，让图表对齐到可见内容区而不是外壳
  // chrome），再除以 SVG 内在尺寸。画布或 SVG 尚未测量时返回
  // MAX_SCALE（首次 render 时上限实际未生效，放大按钮按原行为工
  // 作，下次重算落地后才会收紧）。
  const recomputeFitCanvasScale = useCallback(() => {
    const svgW = svgNatural.width;
    const svgH = svgNatural.height;
    if (svgW <= 0 || svgH <= 0) {
      setFitCanvasScale(MAX_SCALE);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      setFitCanvasScale(MAX_SCALE);
      return;
    }
    // Read computed padding so we don't hardcode the in-page canvas's
    // `1.25rem 1rem` here. The maximized canvas is `0.75rem` all
    // around, so the two cases naturally yield different caps.
    // 读取 computed padding，不在 JS 里硬编码 in-page canvas 的
    // `1.25rem 1rem`。放大态 canvas 是四边 `0.75rem`，两种情
    // 况会自然算出不同的上限。
    const cs = window.getComputedStyle(canvas);
    const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const availW = canvas.clientWidth - padX;
    const availH = canvas.clientHeight - padY;
    if (availW <= 0 || availH <= 0) {
      setFitCanvasScale(MAX_SCALE);
      return;
    }
    setFitCanvasScale(Math.min(MAX_SCALE, availW / svgW, availH / svgH));
  }, [svgNatural.width, svgNatural.height]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: isMaximized intentionally drives recomputeFitCanvasScale so the cap re-derives when the canvas swaps between in-page and maximized layouts.
  useLayoutEffect(() => {
    recomputeFitCanvasScale();
  }, [recomputeFitCanvasScale, isMaximized]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', recomputeFitCanvasScale);
    return () => window.removeEventListener('resize', recomputeFitCanvasScale);
  }, [recomputeFitCanvasScale]);

  // ── Zoom controls / 缩放控制 ─────────────────────────────────────
  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(DEFAULT_SCALE);
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
  // Compute the largest scale at which the rendered SVG fits inside the
  // viewport (with breathing room for the canvas padding and the
  // floating toolbar). This is what "maximize" should mean: zoom the
  // diagram itself up to fill the visible area, NOT just expand the
  // surrounding wrapper to viewport size. The fit caps at MAX_SCALE so
  // a tiny diagram never blows up past the zoom limit.
  // 计算"渲染后 SVG 能放进视口（含画布内边距和工具栏留白）"的最大
  // 缩放。"放大"的正确含义是图表本身被放大铺满可见区，而不是单纯
  // 把外壳撑到视口大小。封顶 MAX_SCALE，避免极小的图表被强制放大
  // 超过缩放上限。
  const computeFitViewportScale = useCallback((): number => {
    const svgW = svgNatural.width;
    const svgH = svgNatural.height;
    if (svgW <= 0 || svgH <= 0) return DEFAULT_SCALE;
    if (typeof window === 'undefined') return DEFAULT_SCALE;
    const availW = window.innerWidth - VIEWPORT_FIT_PADDING;
    const availH = window.innerHeight - VIEWPORT_FIT_PADDING - VIEWPORT_FIT_TOOLBAR_GAP;
    if (availW <= 0 || availH <= 0) return DEFAULT_SCALE;
    return Math.min(availW / svgW, availH / svgH, MAX_SCALE);
  }, [svgNatural.width, svgNatural.height]);

  const toggleMaximize = useCallback(() => {
    setIsMaximized((m) => {
      if (m) {
        // Exiting: restore the scale the user had before maximizing so
        // a maximize / minimize round-trip doesn't wipe out their zoom.
        // 退出：恢复进入放大前的缩放，避免来回一次清掉用户主动的缩放。
        setScale(preMaximizeScaleRef.current);
      } else {
        // Entering: snapshot the current scale (for the restore above)
        // and jump the diagram to fit-viewport — but never shrink the
        // diagram. If the user already zoomed in past fit-viewport
        // (e.g. 125% on a wide canvas where fit-viewport ≈ 100%),
        // keep their scale; the canvas scrolls if it overflows. The
        // "maximize" verb means grow, not shrink.
        // 进入：记录当前缩放（供退出时恢复），把图表跳到
        // fit-viewport —— 但绝不缩小。如果用户已经放大到超过
        // fit-viewport（例如宽画布上 125%，fit-viewport ≈ 100%），
        // 保持其缩放；图表溢出时画布滚动。"放大"的语义是放大，
        // 不是缩小。
        preMaximizeScaleRef.current = scale;
        const fitViewport = computeFitViewportScale();
        setScale(Math.max(scale, fitViewport));
      }
      return !m;
    });
  }, [scale, computeFitViewportScale]);

  // Escape exits maximize for keyboard / accessibility parity with native
  // modals. Also restore the pre-maximize scale so the user's zoom is
  // preserved (same restore path as toggleMaximize's exit branch).
  // Esc 键退出放大态，贴近原生弹窗的键盘可访问性；同时恢复进入
  // 放大前的缩放，与 toggleMaximize 的退出分支走同一条恢复路径。
  useEffect(() => {
    if (!isMaximized) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setScale(preMaximizeScaleRef.current);
        setIsMaximized(false);
      }
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

  // CSS custom properties drive the zoom target's *layout* size and the
  // pan transform. Scale lives in the layout (width/height) so the canvas
  // sees the actual rendered footprint and never produces an unwanted
  // scrollbar; the transform is now reserved for panning only.
  //
  // `--svg-w` / `--svg-h` MUST be unit-bearing `<length>`s (e.g. `800px`),
  // not bare numbers. `calc()` requires at least one operand to be a
  // `<length>` for the result to be a valid `<length>`; multiplying two
  // `<number>`s yields a `<number>`, which `width` / `height` reject —
  // the browser then falls back to `auto` and the layout never changes
  // when the user zooms in or out. The CSS fallbacks (`0px`) below
  // keep `calc()` valid before the SVG natural size is measured.
  // CSS 变量驱动 zoom 目标的*布局*尺寸与平移。缩放落在 layout
  // （width/height）上，画布看到的是真实渲染尺寸，不会出现多余的
  // 滚动条；transform 只用来平移。
  //
  // `--svg-w` / `--svg-h` 必须是带单位的 `<length>`（如 `800px`），
  // 不能是裸数字。`calc()` 至少要有一个 `<length>` 操作数才能得到
  // 有效的 `<length>`；两个 `<number>` 相乘的结果是 `<number>`，
  // `width` / `height` 会拒绝接受，浏览器就回退到 `auto`，导致
  // 用户缩放时布局尺寸完全不变。下方 CSS 的 `0px` 回退让 `calc()`
  // 在 SVG 尺寸未测量前仍合法。
  const zoomStyle = {
    '--svg-w': `${svgNatural.width}px`,
    '--svg-h': `${svgNatural.height}px`,
    '--mermaid-scale': scale,
    '--mermaid-pan-x': `${pan.x}px`,
    '--mermaid-pan-y': `${pan.y}px`,
  } as CSSProperties;
  const canZoomOut = scale > MIN_SCALE;
  const canZoomIn = scale < MAX_SCALE;
  // Reset is available when the current state diverges from the fixed
  // DEFAULT_SCALE default (either zoom or pan has been changed). A small
  // epsilon guards against floating-point drift between `scale` and
  // `DEFAULT_SCALE`.
  // 缩放或平移任一偏离 DEFAULT_SCALE 即可重置；用极小 epsilon 兜底
  // 浮点精度抖动。
  const canReset = Math.abs(scale - DEFAULT_SCALE) > 0.005 || pan.x !== 0 || pan.y !== 0;

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
        ref={canvasRef}
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
      ref={inPageWrapperRef}
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

  // Dim backdrop for maximize mode: a separate `position: fixed` element
  // portaled to <body>. Keeping it OUTSIDE the wrapper means the wrapper
  // itself can stay transparent and centered (no "viewport-sized frame"
  // look) — the backdrop is the only thing that visually fills the
  // viewport, the wrapper just lays out the diagram + toolbar.
  // 放大模式的 dim 背景：独立的 `position: fixed` 元素 portal 到
  // <body>。把它放在 wrapper 外面，wrapper 就能保持透明、居中（不会
  // 看起来像"撑满视口的边框"）—— 视口上唯一可见的是 backdrop，
  // wrapper 只负责布置图表 + 工具栏。
  const maximizedBackdrop = <div className="mermaid-maximized-backdrop" aria-hidden="true" />;

  if (mounted && isMaximized && typeof document !== 'undefined') {
    return (
      <>
        {inPageWrapper}
        {createPortal(maximizedBackdrop, document.body)}
        {createPortal(maximizedWrapper, document.body)}
      </>
    );
  }
  return inPageWrapper;
}
