// Centralized Mermaid asset scheduler.
//
// Normal pages fetch SVGs whose graph layout was completed at build time, so
// the browser never downloads or executes Mermaid/Dagre for known charts. The
// existing serialized queue, viewport priority, skeleton, cache, and final SVG
// normalization remain in place. Mermaid is dynamically imported only when a
// generated asset is missing or cannot be read, preserving development and
// failure fallback without putting the layout engine on the normal path.
//
// 统一的 Mermaid 资产调度器。
// 正常页面读取构建阶段已完成图布局的 SVG，因此已知图表不会在浏览器下载或
// 执行 Mermaid / Dagre。原有串行队列、视口优先级、骨架屏、缓存与最终 SVG
// 归一化保持不变；仅当生成资产缺失或读取失败时才动态导入 Mermaid，既保留
// 开发与异常兜底，也让布局引擎彻底退出正常加载路径。

import { getPreRenderedMermaidPath } from '../assets';
import { MERMAID_CONFIG } from '../config';
import { applySvgFixes, computeExpandedViewBox } from './svg-utils';

type MermaidApi = typeof import('mermaid')['default'];

export interface MermaidRenderResult {
  svgContent: string;
  naturalSize: {
    width: number;
    height: number;
  };
  diagramType: string | null;
}

// Chart work only starts once input has been quiet for at least this long, so
// renders land in reading pauses instead of interaction frames. The delay only
// gates the first render after an input; between successive charts the reader
// is already stationary, so bulk of the queue drains without waiting.
// 输入静止达到该时长后才允许渲染，使渲染落在阅读停顿而非交互帧上。
// 该门槛只约束“输入后的第一张图”；排队中的后续图表无需再次等待，
// 整页不会因此明显变慢。
const ACTIVITY_QUIET_DELAY = 300;

// How often the pump re-checks whether the reader has gone quiet.
// 泵每隔该间隔重新检查读者是否已静止。
const ACTIVITY_POLL_INTERVAL = 60;

// Do not block the first chart on the full font set: a slow gallery font can
// hold `document.fonts.ready` for seconds. We cap the wait so measurement
// starts promptly; labels settle when fonts arrive.
// 首图不等待全部字体就绪：字体较慢时 `document.fonts.ready` 可能数秒才
// resolve，这里限时等待，测量尽快开始；字体到位后标签会自动跟上。
const FONT_READY_CAP = 1200;

let counter = 0;
let mermaidPromise: Promise<MermaidApi> | undefined;
let mermaidInitialized = false;
let hasActivity = false;
let lastActivityAt = 0;

const svgCache = new Map<string, MermaidRenderResult>();
const inflight = new Map<string, Promise<MermaidRenderResult>>();
// Subscribers awaiting a chart source. Charts only render once promoted near
// the viewport; subscribers are notified when the SVG lands (or fails).
// 等待某图表源码的订阅者。图表仅在接近视口被 promote 后才渲染；
// SVG 落地（或失败）时通知订阅者。
const subscribers = new Map<string, Set<(result: MermaidRenderResult | null) => void>>();
const queue: QueueItem[] = [];
let pumping = false;

interface QueueItem {
  code: string;
  resolve: (result: MermaidRenderResult) => void;
  reject: (error: unknown) => void;
}

// Track the reader's recent input so the pump can pause during interaction.
// 记录读者最近的输入时间，供渲染泵在交互期间暂停。
if (typeof window !== 'undefined') {
  const markActivity = () => {
    hasActivity = true;
    lastActivityAt = performance.now();
  };
  window.addEventListener('scroll', markActivity, { passive: true });
  window.addEventListener('pointermove', markActivity, { passive: true });
  window.addEventListener('pointerdown', markActivity, { passive: true });
  window.addEventListener('keydown', markActivity, { passive: true });
}

function loadMermaid() {
  mermaidPromise ??= import('mermaid').then((module) => module.default);
  return mermaidPromise;
}

function initializeMermaid(mermaid: MermaidApi) {
  if (mermaidInitialized) return;

  mermaid.initialize(MERMAID_CONFIG);
  mermaidInitialized = true;
}

// Measure and normalize a rendered SVG inside a hidden container, so the page
// never pays for geometry math (getBBox chains) on the injection frame. The
// returned markup already carries the final viewBox, normalized attributes,
// and laid-out label geometry. The container reuses the project's
// `.mermaid-svg-host` class so metric-affecting label styles that finalize
// glyph sizes are present during measurement.
// 在隐藏容器中测量并归一化渲染后的 SVG，避免页面在注入帧承担几何计算
// （getBBox 链）。返回值已携带最终 viewBox、归一化属性与排好的标签几何。
// 容器复用项目 `.mermaid-svg-host` 类，使影响字形度量的标签样式在测量期间生效。
function finalizeSvg(svgString: string, diagramType: string | null): MermaidRenderResult {
  const container = document.createElement('div');
  container.className = 'mermaid-svg-host';
  // Off-screen but laid out, so getBBox geometry is valid.
  // 离屏但参与布局，保证 getBBox 几何有效。
  container.style.cssText = 'position: fixed; left: -100000px; top: 0; visibility: hidden;';
  document.body.appendChild(container);
  try {
    container.innerHTML = svgString;
    const svg = container.querySelector<SVGSVGElement>('svg');
    if (!svg) {
      return {
        svgContent: svgString,
        naturalSize: { width: 0, height: 0 },
        diagramType,
      };
    }

    const expanded = computeExpandedViewBox(svg);
    if (expanded) applySvgFixes(svg, expanded.viewBox);
    const viewBox = svg.viewBox.baseVal;
    return {
      svgContent: svg.outerHTML,
      naturalSize: {
        width: Number.isFinite(viewBox.width) ? viewBox.width : 0,
        height: Number.isFinite(viewBox.height) ? viewBox.height : 0,
      },
      diagramType: svg.getAttribute('aria-roledescription') ?? diagramType,
    };
  } finally {
    container.remove();
  }
}

async function renderOne(code: string): Promise<MermaidRenderResult> {
  const preRenderedPath = getPreRenderedMermaidPath(code);
  if (preRenderedPath) {
    try {
      const response = await fetch(preRenderedPath, { cache: 'force-cache' });
      if (response.ok) {
        return finalizeSvg(await response.text(), null);
      }
    } catch {
      // A missing or unreadable generated asset falls through to the existing
      // client renderer while the skeleton remains visible.
      // 生成资产缺失或不可读取时回退到现有客户端渲染，期间骨架屏继续保留。
    }
  }

  const id = `mermaid-${++counter}`;
  // Load the package concurrently with the document font set, but cap the font
  // wait so a slow gallery font never stalls the first chart; if fonts are not
  // ready yet we measure with the fallback family and labels resettle on load.
  // 并行加载依赖与字体，但对字体等待加时上限，避免慢粗体字体拖延首张图；
  // 字体未就绪时先按回退字测量，加载后再自行校准标签。
  const [mermaid] = await Promise.all([
    loadMermaid(),
    (async () => {
      const fontsReady = document.fonts?.ready ?? Promise.resolve();
      return Promise.race([
        fontsReady,
        new Promise((resolve) => setTimeout(resolve, FONT_READY_CAP)),
      ]);
    })(),
  ]);

  initializeMermaid(mermaid);
  const renderHost = document.createElement('div');
  renderHost.className = 'mermaid-svg-host';
  renderHost.style.cssText = 'position: fixed; left: -100000px; top: 0; visibility: hidden;';
  document.body.appendChild(renderHost);
  try {
    const { svg, diagramType } = await mermaid.render(id, code, renderHost);
    // Mermaid can leave its temporary container in the DOM after a render;
    // drop any leftover so repeated charts do not accumulate dead nodes.
    // Mermaid 渲染后可能在 DOM 中遗留临时容器；清理残留，避免重复图表堆积死节点。
    document.getElementById(`d${id}`)?.remove();
    const finalized = finalizeSvg(svg, diagramType);
    return finalized;
  } catch (error) {
    document.getElementById(`d${id}`)?.remove();
    throw error;
  } finally {
    renderHost.remove();
  }
}

// Wait until the reader has been still for a moment, then yield once as a
// macrotask so the browser paints between charts. We deliberately avoid
// requestIdleCallback: on pages with continuous animations the idle budget is
// never reported, and a budget-gated loop would stall the whole queue for
// seconds. A quiet gate keeps the heavy render off active scroll frames; the
// pacing comes from the reader's own pauses instead.
// 等待读者静止片刻后，再用一个宏任务让出，使图表之间能正常绘制。
// 刻意不使用 requestIdleCallback：含持续动画的页面上空闲预算几乎永远不
// 上报，预算门控会让整队图表停滞数秒。改用静止门槛把重渲染挡在滚动帧
// 之外，队列节奏直接跟随读者自身的停顿。
function waitForRenderSlot(): Promise<void> {
  return new Promise<void>((resolve) => {
    const attempt = () => {
      // Wait only until the input has been quiet; before any input there is
      // nothing to pause for.
      if (hasActivity && performance.now() - lastActivityAt < ACTIVITY_QUIET_DELAY) {
        setTimeout(attempt, ACTIVITY_POLL_INTERVAL);
        return;
      }
      setTimeout(resolve, 0);
    };
    attempt();
  });
}

// Serialized render loop: one chart per quiet slot, in queue order.
// 串行渲染循环：每个静止窗口渲染一张，按队列顺序执行。
function pump(): void {
  if (pumping) return;
  pumping = true;

  void (async () => {
    try {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;

        await waitForRenderSlot();

        try {
          const result = await renderOne(item.code);
          svgCache.set(item.code, result);
          inflight.delete(item.code);
          item.resolve(result);
          notifySubscribers(item.code, result);
        } catch (error) {
          inflight.delete(item.code);
          item.reject(error);
          notifySubscribers(item.code, null);
        }
      }
    } finally {
      pumping = false;
    }
  })();
}

// Enqueue a chart source for rendering. `front` pushes the chart to the head
// of the queue, used when the reader is approaching the chart. Charts are only
// enqueued here once promoted, so sources far from the viewport stay pending.
// 将图表源码入队参与渲染。`front` 把图表插到队首，供读者接近图表时使用。
// 只有被视口 promote 的图表才会入队，远离视口的源码保持待命不渲染。
function enqueueSvg(code: string, front = false): Promise<MermaidRenderResult> {
  const trimmed = code.trim();
  const cached = svgCache.get(trimmed);
  if (cached !== undefined) return Promise.resolve(cached);

  const existing = inflight.get(trimmed);
  if (existing) return existing;

  const promise = new Promise<MermaidRenderResult>((resolve, reject) => {
    const item: QueueItem = { code: trimmed, resolve, reject };
    if (front) {
      queue.unshift(item);
    } else {
      queue.push(item);
    }
  });
  inflight.set(trimmed, promise);
  pump();
  return promise;
}

// Subscribe to a chart's SVG without requesting a render. The callback fires
// immediately if the chart is already cached, otherwise when the render
// completes (or `null` on failure). Used by the render hook so a chart stays a
// skeleton until promoted by the viewport observer.
// 订阅某图表的 SVG 但不再主动请求渲染。若已缓存则立即回调，否则等到渲染
// 完成（失败时回调 `null`）。渲染钩子用它让图表在视口观察器 promote 前
// 保持骨架占位。
export function subscribeSvg(
  code: string,
  callback: (result: MermaidRenderResult | null) => void,
): () => void {
  const trimmed = code.trim();
  const cached = svgCache.get(trimmed);
  if (cached !== undefined) {
    callback(cached);
    return () => {};
  }

  let set = subscribers.get(trimmed);
  if (!set) {
    set = new Set();
    subscribers.set(trimmed, set);
  }
  set.add(callback);
  return () => {
    set.delete(callback);
    if (set.size === 0) subscribers.delete(trimmed);
  };
}

function notifySubscribers(code: string, result: MermaidRenderResult | null): void {
  subscribers.get(code)?.forEach((callback) => {
    callback(result);
  });
}

// Move a chart the reader is approaching to the front of the queue. No-op when
// the chart is already cached, at the head, or currently rendering. Rendering
// still waits for a quiet slot, so approaching a chart never forces a
// synchronous block on a scroll frame.
// 把读者即将看到的图表移到队列前端；已缓存、已在队首或正在渲染时不动作。
// 渲染仍会等待静止窗口，接近图表不会在滚动帧上触发同步阻塞。
export function promoteMermaidChart(code: string): void {
  const trimmed = code.trim();
  if (svgCache.has(trimmed)) return;

  const index = queue.findIndex((item) => item.code === trimmed);
  if (index >= 0) {
    if (index === 0) return;
    const [item] = queue.splice(index, 1);
    if (!item) return;
    queue.unshift(item);
    pump();
    return;
  }
  if (inflight.has(trimmed)) return;

  // The hook may not have subscribed (e.g. in code view); render in the
  // background so the cached SVG is ready when the render view is requested.
  // 钩子可能尚未订阅该图表（如处于代码视图）；后台入队渲染以填充缓存，待
  // 用户切回渲染视图时直接使用。
  void enqueueSvg(trimmed, true).catch(() => undefined);
}
