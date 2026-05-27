// Mermaid diagram renderer. Initializes mermaid on mount and re-renders
// whenever the chart source or theme changes. Falls back to raw text on error.
// Mermaid 图表渲染器。挂载时初始化 mermaid，当图表源码或主题变化时重新渲染。出错时回退为原始文本。

'use client';

import mermaid from 'mermaid';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef, useState } from 'react';

let counter = 0;

export function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    setMounted(true);
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const renderChart = useCallback(async () => {
    const code = chart?.trim();
    if (!code || !ref.current || !mountedRef.current) return;

    const id = `mermaid-${++counter}`;

    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: resolvedTheme === 'dark' ? 'dark' : 'default',
      });

      const { svg } = await mermaid.render(id, code);

      if (!mountedRef.current) return;
      if (ref.current) {
        ref.current.innerHTML = svg;
      }
    } catch {
      if (!mountedRef.current) return;
      if (ref.current) {
        ref.current.textContent = code;
      }
      const leftover = document.getElementById(`d${id}`);
      if (leftover) leftover.remove();
    }
  }, [chart, resolvedTheme]);

  useEffect(() => {
    if (!mounted) return;
    renderChart();
  }, [renderChart, mounted]);

  return <div ref={ref} className="my-4 flex justify-center [&>svg]:max-w-full" />;
}
