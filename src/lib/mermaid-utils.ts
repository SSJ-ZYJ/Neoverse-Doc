// Pure utilities for processing Mermaid-rendered SVGs.
// 纯函数工具：处理 Mermaid 渲染后的 SVG。

export interface ExpandedViewBox {
  viewBox: string;
  width: number;
  height: number;
}

const DEFAULT_BBOX_PADDING = 16;

/**
 * Compute an expanded viewBox that actually contains every drawn element,
 * including strokes, arrow heads, edge labels, and filter outputs.
 * Falls back to the SVG's reported viewBox when expansion fails.
 */
export function computeExpandedViewBox(
  svg: SVGSVGElement,
  padding = DEFAULT_BBOX_PADDING,
): ExpandedViewBox | null {
  const vb = svg.viewBox.baseVal;
  let drawnBounds: DOMRect | null = null;
  try {
    // Root getBBox resolves descendant transforms into the SVG user coordinate
    // system. Merging child-local boxes directly skewed the center toward
    // translated nodes, which made diagrams appear right/down aligned.
    // 根 getBBox 会把后代 transform 归一到 SVG 坐标系；混合子节点局部边界会导致图表偏右下。
    drawnBounds = svg.getBBox();
  } catch {
    // Detached or not-yet-painted SVGs fall back to Mermaid's reported viewBox.
  }

  const minX = drawnBounds?.x ?? Number.NaN;
  const minY = drawnBounds?.y ?? Number.NaN;
  const maxX = minX + (drawnBounds?.width ?? Number.NaN);
  const maxY = minY + (drawnBounds?.height ?? Number.NaN);
  const hasDrawnBounds =
    [minX, minY, maxX, maxY].every(Number.isFinite) && maxX > minX && maxY > minY;
  if (hasDrawnBounds) {
    const paddedMinX = minX - padding;
    const paddedMinY = minY - padding;
    const paddedMaxX = maxX + padding;
    const paddedMaxY = maxY + padding;
    const expandedW = paddedMaxX - paddedMinX;
    const expandedH = paddedMaxY - paddedMinY;

    if (expandedW <= 0 || expandedH <= 0) return null;
    return {
      viewBox: `${paddedMinX} ${paddedMinY} ${expandedW} ${expandedH}`,
      width: expandedW,
      height: expandedH,
    };
  }

  if (vb.width > 0 && vb.height > 0) {
    return {
      viewBox: `${vb.x} ${vb.y} ${vb.width} ${vb.height}`,
      width: vb.width,
      height: vb.height,
    };
  }

  return null;
}

/**
 * Apply the expanded viewBox and strip Mermaid's inline max-width/max-height
 * cap so the SVG honors the new dimensions. Sets overflow to visible so
 * filter outputs (drop shadows) are not clipped at the viewBox boundary.
 */
export function applySvgFixes(svg: SVGSVGElement, viewBox: string): void {
  if (svg.getAttribute('viewBox') !== viewBox) {
    svg.setAttribute('viewBox', viewBox);
  }
  if (svg.style.maxWidth) svg.style.removeProperty('max-width');
  if (svg.style.maxHeight) svg.style.removeProperty('max-height');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.style.overflow = 'visible';
}
