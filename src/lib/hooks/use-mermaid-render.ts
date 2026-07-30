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
        flowchart: {
          htmlLabels: true,
          useMaxWidth: false,
        },
        // gitGraph otherwise emits a width-only responsive SVG. The shared
        // renderer normalizes both axes, and fixed intrinsic output prevents
        // the Git-specific layout from being measured against a transient 0px host.
        // gitGraph 默认输出仅含宽度的响应式 SVG；共享渲染器会统一归一化宽高，
        // 固有尺寸输出可避免 Git 专用布局在临时 0px 宿主中被错误测量。
        gitGraph: {
          useMaxWidth: false,
        },
        sequence: {
          useMaxWidth: false,
        },
        themeVariables: {
          background: 'transparent',
          fontFamily: 'inherit',
          darkMode: theme === 'dark',
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
