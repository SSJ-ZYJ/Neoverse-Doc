// Pure utilities for processing Mermaid-rendered SVGs.
// 纯函数工具：处理 Mermaid 渲染后的 SVG。

export interface ExpandedViewBox {
  viewBox: string;
  width: number;
  height: number;
}

const DEFAULT_BBOX_PADDING = 16;
const GIT_BRANCH_LABEL_ALIGNMENT_TOLERANCE = 0.25;

interface SvgPoint {
  x: number;
  y: number;
}

function transformPoint(matrix: DOMMatrix, x: number, y: number): SvgPoint {
  return {
    x: matrix.a * x + matrix.c * y + matrix.e,
    y: matrix.b * x + matrix.d * y + matrix.f,
  };
}

function getTransformedCenter(
  element: SVGGraphicsElement,
): { centerX: number; centerY: number } | null {
  try {
    const bounds = element.getBBox();
    const matrix = element.getCTM();
    if (!matrix) return null;

    const corners = [
      transformPoint(matrix, bounds.x, bounds.y),
      transformPoint(matrix, bounds.x + bounds.width, bounds.y),
      transformPoint(matrix, bounds.x, bounds.y + bounds.height),
      transformPoint(matrix, bounds.x + bounds.width, bounds.y + bounds.height),
    ];
    const xValues = corners.map((point) => point.x);
    const yValues = corners.map((point) => point.y);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    if (![minX, maxX, minY, maxY].every(Number.isFinite)) return null;

    return {
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  } catch {
    return null;
  }
}

/**
 * Mermaid gitGraph positions branch text and its background from the text
 * height but ignores the glyph box's vertical origin. Re-center each generated
 * label from its measured SVG bounds so every font and writing system remains
 * aligned without a font-specific pixel offset.
 *
 * Mermaid gitGraph 仅依据文字高度定位分支文字与背景，却忽略字形边界的纵向
 * 起点。根据实际 SVG 边界重新居中每个生成标签，避免为特定字体写死像素偏移，
 * 并让不同字体与书写系统均保持对齐。
 */
export function alignGitBranchLabels(svg: SVGSVGElement): void {
  const backgrounds = svg.querySelectorAll<SVGRectElement>('rect.branchLabelBkg');
  const labels = svg.querySelectorAll<SVGGElement>('.branchLabel > .label');
  const pairCount = Math.min(backgrounds.length, labels.length);

  for (let index = 0; index < pairCount; index += 1) {
    const background = backgrounds[index];
    const label = labels[index];
    if (!background || !label || label.dataset.mermaidTextAligned === 'true') continue;

    const backgroundCenter = getTransformedCenter(background);
    const labelCenter = getTransformedCenter(label);
    const parent = label.parentNode;
    const parentMatrix = parent instanceof SVGGraphicsElement ? parent.getCTM() : null;
    const ownMatrix = label.transform.baseVal.consolidate()?.matrix;
    if (!backgroundCenter || !labelCenter || !parentMatrix || !ownMatrix) continue;

    const rootDeltaX = backgroundCenter.centerX - labelCenter.centerX;
    const rootDeltaY = backgroundCenter.centerY - labelCenter.centerY;
    const determinant = parentMatrix.a * parentMatrix.d - parentMatrix.b * parentMatrix.c;
    if (!Number.isFinite(determinant) || Math.abs(determinant) < Number.EPSILON) continue;

    const parentDeltaX = (parentMatrix.d * rootDeltaX - parentMatrix.c * rootDeltaY) / determinant;
    const parentDeltaY = (-parentMatrix.b * rootDeltaX + parentMatrix.a * rootDeltaY) / determinant;

    if (
      Math.abs(parentDeltaX) > GIT_BRANCH_LABEL_ALIGNMENT_TOLERANCE ||
      Math.abs(parentDeltaY) > GIT_BRANCH_LABEL_ALIGNMENT_TOLERANCE
    ) {
      label.setAttribute(
        'transform',
        `matrix(${ownMatrix.a} ${ownMatrix.b} ${ownMatrix.c} ${ownMatrix.d} ${ownMatrix.e + parentDeltaX} ${ownMatrix.f + parentDeltaY})`,
      );
    }
    label.dataset.mermaidTextAligned = 'true';
  }
}

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
  alignGitBranchLabels(svg);
  const vb = svg.viewBox.baseVal;
  const hasViewBox =
    [vb.x, vb.y, vb.width, vb.height].every(Number.isFinite) && vb.width > 0 && vb.height > 0;
  // Gantt's generated `today` marker is extrapolated beyond the time scale
  // when today's date falls outside the chart range. Root getBBox() includes
  // that invisible off-canvas line, which can expand an otherwise correct
  // 640px viewBox to several thousand pixels and make the fitted chart tiny.
  // Mermaid's Gantt renderer already reports its intended bounds, so preserve
  // that diagram-specific viewBox instead of treating the marker as overflow.
  // 当今天日期超出甘特图时间范围时，生成的 `today` 标记会沿时间轴外推。
  // 根 getBBox() 会把这条画布外不可见线计入边界，将原本正确的 640px
  // viewBox 扩成数千像素并导致图表过度缩小。甘特图渲染器已经给出预期
  // 边界，因此直接保留其专用 viewBox，不把该标记视为内容溢出。
  const preservesRendererBounds = svg.getAttribute('aria-roledescription') === 'gantt';
  let drawnBounds: DOMRect | null = null;
  if (!preservesRendererBounds) {
    try {
      // Root getBBox resolves descendant transforms into the SVG user coordinate
      // system and is used only as an overflow guard around the renderer's own box.
      // 根 getBBox 会把后代 transform 归一到 SVG 坐标系，此处仅用于检查内容是否
      // 越出专用渲染器已经计算好的边界。
      drawnBounds = svg.getBBox();
    } catch {
      // Detached or not-yet-painted SVGs fall back to Mermaid's reported viewBox.
    }
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
  alignGitBranchLabels(svg);
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
