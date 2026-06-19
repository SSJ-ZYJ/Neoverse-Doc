// Hook: renders a Mermaid chart to SVG on the client.
// 自定义 Hook：在客户端将 Mermaid 图表渲染为 SVG。

'use client';

import mermaid from 'mermaid';
import { useCallback, useEffect, useRef, useState } from 'react';

let counter = 0;

export function useMermaidRender(chart: string, theme: 'dark' | 'default') {
  const mountedRef = useRef(true);
  const [svgContent, setSvgContent] = useState<string | null>(null);

  const renderChart = useCallback(async () => {
    const code = chart?.trim();
    if (!code || !mountedRef.current) return;

    const id = `mermaid-${++counter}`;

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme,
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
