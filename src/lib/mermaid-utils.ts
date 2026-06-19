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
  let minX = vb.x;
  let minY = vb.y;
  let maxX = vb.x + vb.width;
  let maxY = vb.y + vb.height;

  const collectBBox = (el: Element) => {
    if (el instanceof SVGGraphicsElement) {
      try {
        const b = el.getBBox();
        if (
          Number.isFinite(b.x) &&
          Number.isFinite(b.y) &&
          Number.isFinite(b.width) &&
          Number.isFinite(b.height) &&
          b.width >= 0 &&
          b.height >= 0
        ) {
          if (b.x < minX) minX = b.x;
          if (b.y < minY) minY = b.y;
          if (b.x + b.width > maxX) maxX = b.x + b.width;
          if (b.y + b.height > maxY) maxY = b.y + b.height;
        }
      } catch {
        // getBBox can throw on detached / not-yet-rendered elements; safe to skip.
      }
    }
    for (const child of Array.from(el.children)) {
      collectBBox(child);
    }
  };

  try {
    collectBBox(svg);
  } catch {
    // Defensive: if the walk itself throws, fall back to the reported viewBox below.
  }

  const paddedMinX = minX - padding;
  const paddedMinY = minY - padding;
  const paddedMaxX = maxX + padding;
  const paddedMaxY = maxY + padding;
  const expandedW = paddedMaxX - paddedMinX;
  const expandedH = paddedMaxY - paddedMinY;

  if (expandedW > 0 && expandedH > 0) {
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
  svg.style.overflow = 'visible';
}
