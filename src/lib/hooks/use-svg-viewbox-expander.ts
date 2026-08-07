// Hook: measures a Mermaid-rendered SVG and computes an expanded viewBox
// that contains every drawn element. Re-applies fixes only when the rendered
// SVG node changes (for example when maximize mode moves it between wrappers).
// 自定义 Hook：测量 Mermaid 渲染后的 SVG，计算包含所有绘制内容的扩展
// viewBox；仅在渲染后的 SVG 节点变化时重应用修复（例如最大化切换 wrapper）。

'use client';

import { type RefObject, useLayoutEffect, useRef, useState } from 'react';
import { applySvgFixes, computeExpandedViewBox } from '@/lib/mermaid-utils';

export function useSvgViewBoxExpander(
  svgContent: string | null,
  inPageWrapperRef: RefObject<HTMLDivElement | null>,
  maximizedWrapperRef: RefObject<HTMLDivElement | null>,
  isMaximized: boolean,
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

  // Maximize toggling replaces one SVG node with another: entering mounts the
  // portal copy, while exiting remounts the in-page copy from raw svgContent.
  // Apply the stored fixes to whichever node is active so both directions keep
  // GitGraph labels and other normalized geometry. Ordinary zoom, pan, and
  // theme updates still do not revisit Mermaid geometry.
  // 最大化切换会替换 SVG 节点：进入时挂载 Portal 副本，退出时则从原始
  // svgContent 重新挂载页面内副本。对当前激活节点重应用已保存修复，确保两个
  // 方向的 GitGraph 标签及其他归一化几何保持一致；普通缩放、平移与主题变化
  // 仍不会重复处理 Mermaid 几何。
  useLayoutEffect(() => {
    const stored = expandedViewBoxRef.current;
    const wrapper = isMaximized ? maximizedWrapperRef.current : inPageWrapperRef.current;
    const svg = wrapper?.querySelector<SVGSVGElement>('.mermaid-svg-host > svg');
    if (stored && svg) applySvgFixes(svg, stored.viewBox);
  }, [isMaximized, inPageWrapperRef, maximizedWrapperRef]);

  return { expandedViewBoxRef, svgNatural };
}
