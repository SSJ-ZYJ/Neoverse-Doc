// Centralized Mermaid render scheduler.
//
// All charts on a page render through one serialized pump that runs in browser
// idle slots, so Mermaid's heavy synchronous layout work never lands on a
// scroll frame. Rendered SVG is cached by chart source, so repeated or
// revisited charts skip rendering entirely. `promoteMermaidChart()` moves a
// chart the reader is approaching to the front of the queue and marks it
// urgent, letting the idle pump cover visible charts before the reader
// reaches them without ever blocking scroll with busy work.
//
// 统一的 Mermaid 渲染调度器。
// 页面内所有图表经单一串行泵在浏览器空闲时段渲染，避免 Mermaid 的同步
// 布局计算落在滚动帧上。渲染结果按图表源码缓存，重复或再次访问的图表
// 直接复用。`promoteMermaidChart()` 把读者即将看到的图表移到队首并标记
// 为紧急，使空闲泵在读者到达前完成可见图表，同时不因忙碌工作阻塞滚动。

type MermaidApi = typeof import('mermaid')['default'];

// Metric-sensitive label styles must be present while Mermaid measures its
// temporary SVG. Applying them only after injection can shift baselines or make
// an already-measured foreignObject clip its text.
// 影响文字度量的标签样式必须在 Mermaid 测量临时 SVG 时就已生效；若仅在注入后
// 应用，会导致基线偏移，或使已完成测量的 foreignObject 裁剪文字。
const MERMAID_METRIC_THEME_CSS = `
  .cluster-label {
    font-weight: 680;
  }

  .branchLabel text,
  .branchLabel tspan,
  .commit-label {
    font-weight: 750;
  }

  svg[aria-roledescription='timeline'] .timeline-node text {
    font-size: 18px;
    font-weight: 650;
  }

  svg[aria-roledescription='timeline'] > text {
    font-size: 24px;
    font-weight: 750;
  }

  foreignObject,
  .node foreignObject {
    overflow: visible;
  }

  foreignObject div,
  .nodeLabel,
  .nodeLabel p {
    line-height: 1.2;
    margin: 0;
    overflow: visible;
  }
`;

// Minimum idle budget required before starting an ordinary chart render. A
// single chart's layout work cannot be sliced, so the pump waits for at least
// this much spare capacity to keep rendering off active scroll frames.
// 开始渲染普通图表所需的最小空闲预算。单张图的布局无法切片，泵需等到
// 浏览器至少报告这么多空闲容量才开工，避免渲染占用活跃的滚动帧。
const MIN_IDLE_BUDGET = 10;

// Upper bound forcing an idle slot to appear even on busy threads, so queued
// ordinary charts always make progress when the page stays busy.
// 忙碌线程上强制出现空闲槽的上限，确保排队中的普通图表总能取得进展。
const IDLE_TIMEOUT = 4000;

let counter = 0;
let mermaidPromise: Promise<MermaidApi> | undefined;
let mermaidInitialized = false;

const svgCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();
const queue: QueueItem[] = [];
let pumping = false;

interface QueueItem {
  code: string;
  urgent: boolean;
  resolve: (svg: string) => void;
  reject: (error: unknown) => void;
}

function loadMermaid() {
  mermaidPromise ??= import('mermaid').then((module) => module.default);
  return mermaidPromise;
}

function initializeMermaid(mermaid: MermaidApi) {
  if (mermaidInitialized) return;

  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    fontFamily: 'inherit',
    themeCSS: MERMAID_METRIC_THEME_CSS,
    flowchart: {
      htmlLabels: true,
      useMaxWidth: false,
    },
    // Gantt reads its parent width while Mermaid renders in a temporary
    // off-screen container. Use a stable intrinsic width so long pages cannot
    // produce a several-thousand-pixel viewBox.
    // 甘特图会在离屏临时容器中读取父级宽度；使用稳定固有宽度，避免长页面
    // 生成数千像素的 viewBox。
    gantt: {
      fontSize: 12,
      sectionFontSize: 12,
      useMaxWidth: false,
      useWidth: 640,
    },
    // Fixed intrinsic output prevents Git-specific layout from being measured
    // against a transient 0px host.
    // 固有尺寸输出避免 Git 专用布局在临时 0px 宿主中被错误测量。
    gitGraph: {
      rotateCommitLabel: false,
      useMaxWidth: false,
    },
    sequence: {
      useMaxWidth: false,
    },
    timeline: {
      padding: 32,
      useMaxWidth: false,
    },
    themeVariables: {
      background: 'transparent',
      commitLabelFontSize: '12px',
      fontFamily: 'inherit',
      tagLabelFontSize: '12px',
    },
  });
  mermaidInitialized = true;
}

async function renderOne(code: string): Promise<string> {
  const id = `mermaid-${++counter}`;
  // Load the package and project fonts concurrently so final glyph metrics
  // are available before Mermaid measures HTML labels.
  // 并行加载依赖与项目字体，确保 Mermaid 测量 HTML 标签前已获得最终字形尺寸。
  const [mermaid] = await Promise.all([loadMermaid(), document.fonts?.ready ?? Promise.resolve()]);

  initializeMermaid(mermaid);
  try {
    const { svg } = await mermaid.render(id, code);
    // Mermaid can leave its temporary container in the DOM after a render;
    // drop any leftover so repeated charts do not accumulate dead nodes.
    // Mermaid 渲染后可能在 DOM 中遗留临时容器；清理残留，避免重复图表堆积死节点。
    document.getElementById(`d${id}`)?.remove();
    return svg;
  } catch (error) {
    document.getElementById(`d${id}`)?.remove();
    throw error;
  }
}

// Wait for an idle slot with enough remaining budget, retrying over short gaps
// when the thread is busy (such as during active scrolling).
// 等待剩余预算足够的空闲槽；线程繁忙（如滚动过程中）时短暂间隔后重试。
function waitForIdle(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (typeof requestIdleCallback !== 'function') {
      // Browsers without rIC yield to a short macrotask between charts.
      // 不支持 requestIdleCallback 的浏览器在图表之间让出短宏任务。
      setTimeout(resolve, 50);
      return;
    }
    const attempt = () => {
      requestIdleCallback(
        (deadline) => {
          if (deadline.timeRemaining() >= MIN_IDLE_BUDGET) {
            resolve();
          } else {
            setTimeout(attempt, 100);
          }
        },
        { timeout: IDLE_TIMEOUT },
      );
    };
    attempt();
  });
}

// Serialized render loop: one chart per slot, in queue order. Urgent charts
// (viewed by the reader) render immediately; ordinary charts wait for idle.
// 串行渲染循环：每个槽渲染一张，按队列顺序执行。紧急图表（读者即将看到）
// 立即渲染，普通图表等待空闲槽。
function pump(): void {
  if (pumping) return;
  pumping = true;

  void (async () => {
    try {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        if (!item.urgent) {
          await waitForIdle();
        }

        try {
          const svg = await renderOne(item.code);
          svgCache.set(item.code, svg);
          inflight.delete(item.code);
          item.resolve(svg);
        } catch (error) {
          inflight.delete(item.code);
          item.reject(error);
        }
      }
    } finally {
      pumping = false;
    }
  })();
}

// Resolve the SVG for a chart source: from cache, an in-flight render, or a
// newly enqueued idle render. `urgent` skips the idle wait and renders at the
// front of the queue, used when the reader is approaching the chart.
// 解析某图表源码对应的 SVG：命中缓存立即返回、复用进行中的渲染、否则进入
// 空闲渲染队列。`urgent` 跳过空闲等待并渲染到队首，供读者接近图表时使用。
export function getSvg(code: string, urgent = false): Promise<string> {
  const trimmed = code.trim();
  const cached = svgCache.get(trimmed);
  if (cached !== undefined) return Promise.resolve(cached);

  const existing = inflight.get(trimmed);
  if (existing) return existing;

  const promise = new Promise<string>((resolve, reject) => {
    const item: QueueItem = { code: trimmed, urgent, resolve, reject };
    if (urgent) {
      queue.unshift(item);
    } else {
      queue.push(item);
    }
  });
  inflight.set(trimmed, promise);
  pump();
  return promise;
}

// Move a chart the reader is approaching to the front of the queue and mark
// it urgent. No-op when the chart is already cached or currently rendering.
// 把读者即将看到的图表移到队列前端并标记为紧急；已缓存或正在渲染时不动作。
export function promoteMermaidChart(code: string): void {
  const trimmed = code.trim();
  if (svgCache.has(trimmed)) return;

  const index = queue.findIndex((item) => item.code === trimmed);
  if (index >= 0) {
    const item = queue[index];
    if (index === 0 && item.urgent) return;
    queue.splice(index, 1);
    item.urgent = true;
    queue.unshift(item);
    pump();
    return;
  }
  if (inflight.has(trimmed)) return;

  // The hook may not have subscribed (e.g. in code view); render in the
  // background so the cached SVG is ready when the render view is requested.
  // 钩子可能尚未订阅该图表（如处于代码视图）；后台渲染以填充缓存，待用户
  // 切回渲染视图时直接使用。
  void getSvg(trimmed, true).catch(() => undefined);
}
