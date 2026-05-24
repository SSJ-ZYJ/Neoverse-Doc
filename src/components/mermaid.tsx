'use client';

import mermaid from 'mermaid';
import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef } from 'react';

let counter = 0;

export function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  const renderChart = useCallback(async () => {
    const code = chart?.trim();
    if (!code || !ref.current) return;

    mermaid.initialize({
      startOnLoad: false,
      theme: resolvedTheme === 'dark' ? 'dark' : 'default',
    });

    try {
      const { svg } = await mermaid.render(`mermaid-${++counter}`, code);
      ref.current.innerHTML = svg;
    } catch {
      ref.current.textContent = code;
    }
  }, [chart, resolvedTheme]);

  useEffect(() => {
    renderChart();
  }, [renderChart]);

  return <div ref={ref} className="my-4 flex justify-center [&>svg]:max-w-full" />;
}
