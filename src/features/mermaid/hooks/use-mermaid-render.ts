// Hook: subscribes to the shared Mermaid render scheduler for a chart source.
// The hook never requests a render itself; charts stay pending skeletons until
// promoted by the viewport observer, so the diagram the reader is currently
// looking at renders first and far-away charts do not steal render time. The
// SVG is cached per chart source across instances and route transitions.
// 自定义 Hook：为图表源码订阅共享的 Mermaid 渲染调度器。Hook 自身不再主动
// 请求渲染，图表在视口观察器 promote 前保持骨架占位，因此读者正在看的图
// 优先渲染，远处的图不会抢占渲染时间。SVG 按源码在实例与路由切换间缓存
// 复用。

'use client';

import { useEffect, useRef, useState } from 'react';
import { type MermaidRenderResult, subscribeSvg } from '../runtime/render-scheduler';

const EMPTY_NATURAL_SIZE = { width: 0, height: 0 };

export function useMermaidRender(chart: string, enabled = true) {
  const mountedRef = useRef(true);
  const sourceRef = useRef<string | null>(null);
  const [renderResult, setRenderResult] = useState<MermaidRenderResult | null>(null);
  const [renderFailed, setRenderFailed] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    const code = chart?.trim();

    // Reset to pending only when the chart source changes; toggling the view
    // mode with the same source keeps any cached SVG on screen while the
    // subscription is re-established.
    // 仅在图表源码变化时重置为待渲染状态；同一图表的视图切换重订阅时
    // 保留已缓存的 SVG 显示，避免无谓的骨架屏闪烁。
    if (sourceRef.current !== code) {
      sourceRef.current = code;
      setRenderResult(null);
      setRenderFailed(false);
    }

    if (!enabled || !code) return;

    // Subscribe only: the callback fires when the promoted render lands (or
    // with `null` on failure). The result includes final viewBox metadata, so
    // the SVG and its correctly sized frame enter the DOM in the same render;
    // no timer or animation-frame delay is added here.
    // 仅订阅：promote 的渲染落地（或失败为 `null`）时回调。结果同时携带最终
    // viewBox 元数据，使 SVG 与尺寸正确的外框在同一次渲染中进入 DOM；此处
    // 不再额外添加定时器或动画帧延迟。
    const unsubscribe = subscribeSvg(code, (result) => {
      if (!mountedRef.current) return;
      if (result === null) {
        setRenderResult(null);
        setRenderFailed(true);
      } else {
        setRenderResult(result);
        setRenderFailed(false);
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [chart, enabled]);

  return {
    svgContent: renderResult?.svgContent ?? null,
    svgNatural: renderResult?.naturalSize ?? EMPTY_NATURAL_SIZE,
    diagramType: renderResult?.diagramType ?? null,
    renderFailed,
  };
}
