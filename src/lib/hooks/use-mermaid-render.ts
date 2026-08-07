// Hook: lazily loads Mermaid and renders a chart to SVG near the viewport.
// Mermaid is initialized once per client session; theme changes are handled by
// project CSS variables so they do not re-parse and re-layout every diagram.
// A request ID guard prevents stale SVG from winning when chart input changes.
// 自定义 Hook：按需加载 Mermaid，并在图表接近视口时渲染 SVG。
// Mermaid 在客户端会话中只初始化一次；主题变化交给项目 CSS 变量处理，
// 不再重新解析、布局整页图表。request ID 守卫防止旧图覆盖新的源码结果。

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type MermaidApi = typeof import('mermaid')['default'];

let counter = 0;
let mermaidPromise: Promise<MermaidApi> | undefined;
let mermaidInitialized = false;

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

export function useMermaidRender(chart: string, enabled = true) {
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const renderedChartRef = useRef<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);

  const renderChart = useCallback(async () => {
    const code = chart?.trim();
    if (!enabled || !code || !mountedRef.current || renderedChartRef.current === code) return;

    const id = `mermaid-${++counter}`;
    // Track the latest request so stale renders can be discarded.
    // 跟踪最新请求，丢弃过期的渲染结果。
    const requestId = ++requestIdRef.current;

    try {
      // Load the package and project fonts concurrently. Final glyph metrics
      // remain available before Mermaid measures HTML labels.
      // 并行加载依赖与项目字体，同时确保 Mermaid 测量 HTML 标签前
      // 已获得最终字形尺寸。
      const [mermaid] = await Promise.all([
        loadMermaid(),
        document.fonts?.ready ?? Promise.resolve(),
      ]);

      initializeMermaid(mermaid);
      const { svg } = await mermaid.render(id, code);
      // Only apply the result if this is still the most recent request.
      // 仅当此请求仍为最新时才应用结果。
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      renderedChartRef.current = code;
      setSvgContent(svg);
    } catch {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setSvgContent(null);
      const leftover = document.getElementById(`d${id}`);
      if (leftover) leftover.remove();
    }
  }, [chart, enabled]);

  useEffect(() => {
    mountedRef.current = true;
    renderChart();
    return () => {
      mountedRef.current = false;
    };
  }, [renderChart]);

  return svgContent;
}
