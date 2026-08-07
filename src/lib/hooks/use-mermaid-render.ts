// Hook: subscribes to the shared Mermaid render scheduler for a chart source.
// Rendering happens in browser idle slots through the scheduler, so scrolling
// never blocks on layout work; the SVG is cached per chart source across
// instances and route transitions. A request ID guard prevents stale SVG from
// winning when the chart input changes.
// 自定义 Hook：为图表源码订阅共享的 Mermaid 渲染调度器。渲染由调度器在
// 浏览器空闲时段完成，滚动不会被布局计算阻塞；SVG 按源码在实例与路由
// 切换间缓存复用。request ID 守卫防止旧图覆盖新的源码结果。

'use client';

import { useEffect, useRef, useState } from 'react';
import { getSvg } from '@/lib/mermaid-render-scheduler';

export function useMermaidRender(chart: string, enabled = true) {
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const [svgContent, setSvgContent] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    const requestId = ++requestIdRef.current;
    const code = chart?.trim();
    if (!enabled || !code) return;

    getSvg(code)
      .then((svg) => {
        // Only apply the result if this request is still the most recent one.
        // 仅当此请求仍为最新时才应用结果。
        if (mountedRef.current && requestId === requestIdRef.current) {
          setSvgContent(svg);
        }
      })
      .catch(() => {
        if (mountedRef.current && requestId === requestIdRef.current) {
          setSvgContent(null);
        }
      });

    return () => {
      mountedRef.current = false;
    };
  }, [chart, enabled]);

  return svgContent;
}
