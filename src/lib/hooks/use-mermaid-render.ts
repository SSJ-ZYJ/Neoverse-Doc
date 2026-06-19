// Hook: renders a Mermaid chart to SVG on the client.
// Uses a request ID guard to prevent stale SVG from winning when the chart
// source or theme changes rapidly (e.g., toggling theme back and forth).
// 自定义 Hook：在客户端将 Mermaid 图表渲染为 SVG。
// 使用 request ID 守卫，防止图表源码或主题快速切换时旧 SVG 覆盖新结果。

'use client';

import mermaid from 'mermaid';
import { useCallback, useEffect, useRef, useState } from 'react';

let counter = 0;

export function useMermaidRender(chart: string, theme: 'dark' | 'default') {
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const [svgContent, setSvgContent] = useState<string | null>(null);

  const renderChart = useCallback(async () => {
    const code = chart?.trim();
    if (!code || !mountedRef.current) return;

    const id = `mermaid-${++counter}`;
    // Track the latest request so stale renders can be discarded.
    // 跟踪最新请求，丢弃过期的渲染结果。
    const requestId = ++requestIdRef.current;

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme,
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
  }, [chart, theme]);

  useEffect(() => {
    mountedRef.current = true;
    renderChart();
    return () => {
      mountedRef.current = false;
    };
  }, [renderChart]);

  return svgContent;
}
