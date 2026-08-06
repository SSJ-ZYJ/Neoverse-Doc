// Hook: lazily loads Mermaid and renders a chart to SVG near the viewport.
// Uses a request ID guard to prevent stale SVG from winning when the chart
// source or theme changes rapidly (e.g., toggling theme back and forth).
// The module promise is shared so multiple diagrams never duplicate the package request.
// 自定义 Hook：按需加载 Mermaid，并在图表接近视口时渲染 SVG。
// 使用 request ID 守卫，防止图表源码或主题快速切换时旧 SVG 覆盖新结果。
// 模块 Promise 在图表间共享，避免重复请求同一依赖。

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type MermaidApi = typeof import('mermaid')['default'];

let counter = 0;
let mermaidPromise: Promise<MermaidApi> | undefined;

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

export function useMermaidRender(chart: string, theme: 'dark' | 'default', enabled = true) {
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const [svgContent, setSvgContent] = useState<string | null>(null);

  const renderChart = useCallback(async () => {
    const code = chart?.trim();
    if (!enabled || !code || !mountedRef.current) return;

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
        // off-screen container. On long documentation pages that container can
        // inherit the page scroll width, producing a several-thousand-pixel
        // viewBox that the shared fitter then shrinks to an unreadable scale.
        // Use Mermaid's supported intrinsic width so the chart is measured
        // consistently, centered by the shared SVG host, and only scaled down
        // when the real document canvas is narrower.
        // 甘特图会在 Mermaid 的离屏临时容器中读取父级宽度；长文档可能让该
        // 容器继承整页滚动宽度，生成数千像素的 viewBox，再被通用适配逻辑
        // 缩得过小。使用 Mermaid 官方支持的固有宽度，使图表稳定测量、由
        // 共享 SVG 宿主居中，并且只在真实文档画布较窄时缩小。
        gantt: {
          fontSize: 12,
          sectionFontSize: 12,
          useMaxWidth: false,
          useWidth: 640,
        },
        // gitGraph otherwise emits a width-only responsive SVG. The shared
        // renderer normalizes both axes, and fixed intrinsic output prevents
        // the Git-specific layout from being measured against a transient 0px host.
        // gitGraph 默认输出仅含宽度的响应式 SVG；共享渲染器会统一归一化宽高，
        // 固有尺寸输出可避免 Git 专用布局在临时 0px 宿主中被错误测量。
        gitGraph: {
          rotateCommitLabel: false,
          useMaxWidth: false,
        },
        sequence: {
          useMaxWidth: false,
        },
        themeVariables: {
          background: 'transparent',
          commitLabelFontSize: '12px',
          fontFamily: 'inherit',
          darkMode: theme === 'dark',
          tagLabelFontSize: '12px',
        },
      });

      const { svg } = await mermaid.render(id, code);
      // Only apply the result if this is still the most recent request.
      // 仅当此请求仍为最新时才应用结果。
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setSvgContent(svg);
    } catch {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setSvgContent(null);
      const leftover = document.getElementById(`d${id}`);
      if (leftover) leftover.remove();
    }
  }, [chart, enabled, theme]);

  useEffect(() => {
    mountedRef.current = true;
    renderChart();
    return () => {
      mountedRef.current = false;
    };
  }, [renderChart]);

  return svgContent;
}
