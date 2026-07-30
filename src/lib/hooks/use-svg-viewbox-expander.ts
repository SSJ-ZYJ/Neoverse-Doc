// Hook: measures a Mermaid-rendered SVG and computes an expanded viewBox
// that contains every drawn element. Re-applies the expanded viewBox after
// every commit because React replaces the SVG node on parent re-renders.
// 自定义 Hook：测量 Mermaid 渲染后的 SVG，计算包含所有绘制内容的扩展
// viewBox，并在每次 commit 后重新应用（因为父组件重渲染会替换 SVG 节点）。

'use client';

import { type RefObject, useLayoutEffect, useRef, useState } from 'react';
import { applySvgFixes, computeExpandedViewBox } from '@/lib/mermaid-utils';

export function useSvgViewBoxExpander(
  svgContent: string | null,
  inPageWrapperRef: RefObject<HTMLDivElement | null>,
  maximizedWrapperRef: RefObject<HTMLDivElement | null>,
) {
  const expandedViewBoxRef = useRef<{ viewBox: string; width: number; height: number } | null>(
    null,
  );
  const [svgNatural, setSvgNatural] = useState({ width: 0, height: 0 });

  // Compute and apply the expanded viewBox once the SVG content is injected.
  useLayoutEffect(() => {
    // Clear the previous chart measurement before handling a newly rendered
    // diagram so switching diagram types can never reuse a stale viewBox.
    // 处理新图表前清除旧测量，避免切换图型时复用过期 viewBox。
    expandedViewBoxRef.current = null;
    if (!svgContent) {
      setSvgNatural({ width: 0, height: 0 });
      return;
    }
    const wrapper = inPageWrapperRef.current;
    if (!wrapper) return;
    const svg = wrapper.querySelector<SVGSVGElement>('.mermaid-svg-host > svg');
    if (!svg) return;

    const expanded = computeExpandedViewBox(svg);
    if (!expanded) return;

    applySvgFixes(svg, expanded.viewBox);
    expandedViewBoxRef.current = expanded;
    setSvgNatural({ width: expanded.width, height: expanded.height });
  }, [svgContent, inPageWrapperRef]);

  // Re-apply the expanded viewBox after every commit. React replaces the SVG
  // element on each parent re-render, so the [svgContent]-scoped effect above
  // is not enough: any setState (zoom, pan, maximize, theme) would reset it.
  // applySvgFixes guards each attribute independently: some Mermaid renderers
  // can restore their original width/height while keeping the same viewBox.
  // 每次 commit 后重新应用扩展 viewBox。React 在父组件重渲染时会替换 SVG
  // 节点，仅依赖 [svgContent] 的上方的 effect 不够：任何 setState（缩放、
  // 平移、最大化、主题）都会重置它。applySvgFixes 会分别检查各属性，因为
  // 部分 Mermaid 渲染器会保留 viewBox 却恢复其原始宽高。
  useLayoutEffect(() => {
    const stored = expandedViewBoxRef.current;
    if (!stored) return;

    const wrappers = [inPageWrapperRef.current, maximizedWrapperRef.current];
    for (const wrapper of wrappers) {
      if (!wrapper) continue;
      const svg = wrapper.querySelector<SVGSVGElement>('.mermaid-svg-host > svg');
      if (!svg) continue;
      applySvgFixes(svg, stored.viewBox);
    }
  });

  return { expandedViewBoxRef, svgNatural };
}
