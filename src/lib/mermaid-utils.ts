// Pure utilities for processing Mermaid-rendered SVGs.
// 纯函数工具：处理 Mermaid 渲染后的 SVG。

export interface ExpandedViewBox {
  viewBox: string;
  width: number;
  height: number;
}

const DEFAULT_BBOX_PADDING = 16;

/**
 * Preserve Mermaid's diagram-specific viewBox and expand it only when the
 * rendered bounds escape it. Diagram renderers such as gitGraph already
 * calculate transformed branch and commit-label geometry; replacing that box
 * with a second generic getBBox() result can shift or crop the diagram.
 */
export function computeExpandedViewBox(
  svg: SVGSVGElement,
  padding = DEFAULT_BBOX_PADDING,
): ExpandedViewBox | null {
  const vb = svg.viewBox.baseVal;
  const hasViewBox =
    [vb.x, vb.y, vb.width, vb.height].every(Number.isFinite) && vb.width > 0 && vb.height > 0;
  let drawnBounds: DOMRect | null = null;
  try {
    // Root getBBox resolves descendant transforms into the SVG user coordinate
    // system and is used only as an overflow guard around the renderer's own box.
    // 根 getBBox 会把后代 transform 归一到 SVG 坐标系，此处仅用于检查内容是否
    // 越出专用渲染器已经计算好的边界。
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
  if (hasViewBox || hasDrawnBounds) {
    const reportedMinX = hasViewBox ? vb.x : minX - padding;
    const reportedMinY = hasViewBox ? vb.y : minY - padding;
    const reportedMaxX = hasViewBox ? vb.x + vb.width : maxX + padding;
    const reportedMaxY = hasViewBox ? vb.y + vb.height : maxY + padding;
    const expandedMinX = hasDrawnBounds && minX < reportedMinX ? minX - padding : reportedMinX;
    const expandedMinY = hasDrawnBounds && minY < reportedMinY ? minY - padding : reportedMinY;
    const expandedMaxX = hasDrawnBounds && maxX > reportedMaxX ? maxX + padding : reportedMaxX;
    const expandedMaxY = hasDrawnBounds && maxY > reportedMaxY ? maxY + padding : reportedMaxY;
    const expandedW = expandedMaxX - expandedMinX;
    const expandedH = expandedMaxY - expandedMinY;

    if (expandedW <= 0 || expandedH <= 0) return null;
    return {
      viewBox: `${expandedMinX} ${expandedMinY} ${expandedW} ${expandedH}`,
      width: expandedW,
      height: expandedH,
    };
  }

  return null;
}

/**
 * Apply the normalized viewBox and root dimensions. Mermaid diagram renderers
 * emit different width/height combinations (including gitGraph's width-only
 * responsive SVG), so the shared host always normalizes both axes to 100%.
 */
export function applySvgFixes(svg: SVGSVGElement, viewBox: string): void {
  if (svg.getAttribute('viewBox') !== viewBox) {
    svg.setAttribute('viewBox', viewBox);
  }
  if (svg.style.maxWidth) svg.style.removeProperty('max-width');
  if (svg.style.maxHeight) svg.style.removeProperty('max-height');
  if (svg.getAttribute('width') !== '100%') svg.setAttribute('width', '100%');
  if (svg.getAttribute('height') !== '100%') svg.setAttribute('height', '100%');
  if (svg.getAttribute('preserveAspectRatio') !== 'xMidYMid meet') {
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }
  if (svg.style.overflow !== 'visible') svg.style.overflow = 'visible';
}
