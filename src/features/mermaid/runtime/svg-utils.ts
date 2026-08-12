// Pure utilities for processing Mermaid-rendered SVGs.
// 纯函数工具：处理 Mermaid 渲染后的 SVG。

export interface ExpandedViewBox {
  viewBox: string;
  width: number;
  height: number;
}

const DEFAULT_BBOX_PADDING = 16;
const GIT_BRANCH_LABEL_ALIGNMENT_TOLERANCE = 0.25;
const GIT_BRANCH_LABEL_INLINE_OFFSET = 24;
const GIT_COMMIT_LABEL_INLINE_PADDING = 10;
const GIT_COMMIT_LABEL_BLOCK_PADDING = 4;
const GIT_COMMIT_LABEL_NODE_GAP = 6;
const GIT_COMMIT_MIN_INLINE_GAP = 12;
const GIT_COMMIT_NODE_HALF_EXTENT = 10;
const GIT_COMMIT_POSITION_TOLERANCE = 0.5;

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

function getLocalBounds(element: SVGGraphicsElement): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  try {
    const bounds = element.getBBox();
    if (![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)) return null;
    return bounds;
  } catch {
    return null;
  }
}

function getTransformedBounds(element: SVGGraphicsElement): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
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

    return { minX, minY, maxX, maxY };
  } catch {
    return null;
  }
}

function getTransformedCenter(
  element: SVGGraphicsElement,
): { centerX: number; centerY: number } | null {
  const bounds = getTransformedBounds(element);
  if (!bounds) return null;

  return {
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerY: (bounds.minY + bounds.maxY) / 2,
  };
}

/**
 * Normalize every timeline label from the card's actual path bounds and merge
 * Mermaid's detached accent rule into a square card bottom border. The title
 * keeps Mermaid's original coordinates and anchors so normal and maximized
 * views share the same renderer-defined placement.
 *
 * 依据卡片实际路径边界居中所有时间轴标签，并将 Mermaid 独立的强调线合并到
 * 直角卡片底边。标题保留 Mermaid 原始坐标与锚点，使普通视图和全屏视图始终
 * 使用渲染器定义的默认位置。
 */
export function normalizeTimeline(svg: SVGSVGElement): void {
  if (svg.getAttribute('aria-roledescription') !== 'timeline') return;

  for (const node of svg.querySelectorAll<SVGGElement>('.timeline-node')) {
    const background = node.querySelector<SVGPathElement>(':scope > g > path.node-bkg');
    const text = node.querySelector<SVGTextElement>(':scope > g > text');
    const textGroup = text?.parentElement;
    const bounds = background ? getLocalBounds(background) : null;
    if (!background || !text || !textGroup || !bounds) continue;

    background.setAttribute(
      'd',
      [
        `M ${bounds.x} ${bounds.y}`,
        `H ${bounds.x + bounds.width}`,
        `V ${bounds.y + bounds.height}`,
        `H ${bounds.x}`,
        'Z',
      ].join(' '),
    );

    const bottomBorder = node.querySelector<SVGLineElement>(':scope > g > line');
    if (bottomBorder) {
      const bottom = bounds.y + bounds.height;
      bottomBorder.setAttribute('x1', String(bounds.x));
      bottomBorder.setAttribute('x2', String(bounds.x + bounds.width));
      bottomBorder.setAttribute('y1', String(bottom));
      bottomBorder.setAttribute('y2', String(bottom));
    }

    const tspans = Array.from(text.children).filter(
      (element): element is SVGTSpanElement => element.tagName.toLowerCase() === 'tspan',
    );
    const fontSize = Number.parseFloat(getComputedStyle(text).fontSize) || 18;
    const lineHeight = fontSize * 1.18;
    const textHeight = Math.max(tspans.length - 1, 0) * lineHeight;
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2 - textHeight / 2;

    textGroup.setAttribute('transform', `translate(${centerX}, ${centerY})`);
    text.removeAttribute('dy');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('alignment-baseline', 'middle');
    text.setAttribute('text-anchor', 'middle');

    tspans.forEach((tspan, index) => {
      tspan.setAttribute('x', '0');
      tspan.setAttribute('dy', index === 0 ? '0' : `${lineHeight}px`);
    });
  }
}

/**
 * Mermaid flowcharts paint the complete edge layer after the cluster layer, so
 * cross-cluster links can cover subgraph titles. Move only cluster labels into
 * a final overlay group while leaving cluster surfaces below edges and regular
 * nodes above them. The operation is naturally idempotent because moved labels
 * are no longer descendants of the original cluster layer.
 *
 * Mermaid 流程图会在完整 cluster 层之后绘制边，因此跨子图连线可能覆盖子图
 * 标题。这里只将 cluster 标题移入最终覆盖层，保留子图表面位于连线之下、普通
 * 节点位于连线之上的原有结构。移动后的标题不再属于原 cluster 层，重复执行
 * 不会再次移动或产生累计偏移。
 */
export function normalizeFlowchartClusterLabels(svg: SVGSVGElement): void {
  const role = svg.getAttribute('aria-roledescription');
  if (role !== 'flowchart-v2' && role !== 'flowchart') return;

  const root = svg.querySelector<SVGGElement>('g.root');
  const clusters = root?.querySelector<SVGGElement>(':scope > g.clusters');
  if (!root || !clusters) return;

  const labels = Array.from(
    clusters.querySelectorAll<SVGGElement>(':scope > g.cluster > g.cluster-label'),
  );
  if (labels.length === 0) return;

  let overlay = root.querySelector<SVGGElement>(
    ':scope > g[data-mermaid-cluster-label-layer="true"]',
  );
  if (!overlay) {
    overlay = svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'g');
    overlay.setAttribute('class', 'mermaid-cluster-label-layer');
    overlay.dataset.mermaidClusterLabelLayer = 'true';
    root.appendChild(overlay);
  }

  for (const label of labels) overlay.appendChild(label);
}

/**
 * Mermaid's sequence renderer creates the Note rectangle and its text in the
 * same group, then appends message lines and other diagram layers after that
 * group. Move each complete note group to the end of its parent, with its
 * background first and text last, so no later sibling can paint over the note
 * text. This supports both normal text and foreignObject labels.
 *
 * Mermaid 的时序图渲染器会把 Note 背景与文字放在同一分组中，随后又在该分组
 * 之后追加消息线等图层。将完整 Note 分组移到父级末尾，并保证背景在前、文字
 * 在后，避免后续兄弟图层覆盖备注文字；同时兼容普通 text 与 foreignObject 标签。
 */
export function normalizeSequenceNotes(svg: SVGSVGElement): void {
  if (svg.getAttribute('aria-roledescription') !== 'sequence') return;

  for (const noteGroup of svg.querySelectorAll<SVGGElement>('g[data-et="note"]')) {
    const noteBackground = noteGroup.querySelector<SVGElement>(':scope > .note');
    if (!noteBackground) continue;

    noteGroup.prepend(noteBackground);
    for (const child of Array.from(noteGroup.children)) {
      if (child === noteBackground) continue;
      const isNoteText =
        child.matches('.noteText, foreignObject') || Boolean(child.querySelector('.noteText'));
      if (isNoteText) noteGroup.appendChild(child);
    }
    noteGroup.parentNode?.appendChild(noteGroup);
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
    if (!background || !label) continue;

    if (label.dataset.mermaidTextAligned !== 'true') {
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

      const parentDeltaX =
        (parentMatrix.d * rootDeltaX - parentMatrix.c * rootDeltaY) / determinant;
      const parentDeltaY =
        (-parentMatrix.b * rootDeltaX + parentMatrix.a * rootDeltaY) / determinant;

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

    if (background.dataset.mermaidTrackSpaced === 'true') continue;

    const backgroundMatrix = background.transform.baseVal.consolidate()?.matrix;
    const labelMatrix = label.transform.baseVal.consolidate()?.matrix;
    if (!backgroundMatrix || !labelMatrix) continue;

    // Mermaid leaves only 5px between the branch chip and the first commit.
    // Move both generated label layers toward inline-start so the shared
    // GitGraph presentation keeps a clear visual separation from the track.
    // Mermaid 默认只在分支标签与首个提交间保留 5px。统一将文字和背景向
    // 行首移动，使共享 GitGraph 样式与分支线保持清晰的视觉间距。
    background.setAttribute(
      'transform',
      `matrix(${backgroundMatrix.a} ${backgroundMatrix.b} ${backgroundMatrix.c} ${backgroundMatrix.d} ${backgroundMatrix.e - GIT_BRANCH_LABEL_INLINE_OFFSET} ${backgroundMatrix.f})`,
    );
    label.setAttribute(
      'transform',
      `matrix(${labelMatrix.a} ${labelMatrix.b} ${labelMatrix.c} ${labelMatrix.d} ${labelMatrix.e - GIT_BRANCH_LABEL_INLINE_OFFSET} ${labelMatrix.f})`,
    );
    background.dataset.mermaidTrackSpaced = 'true';
  }
}

/**
 * Mermaid sizes horizontal commit-label backgrounds from the raw glyph width
 * with almost no inline padding, and positions text by its baseline. Normalize
 * every generated pair to the same compact padding used by regular Mermaid
 * edge labels, then anchor the text to the chip's true center. This runs on
 * rendered SVG only, so chart source and the code view remain untouched.
 *
 * Mermaid 按原始字形宽度生成水平提交标签背景，几乎没有横向留白，并以
 * baseline 定位文字。这里将所有生成结果统一到可复用的最小标签尺寸，再把
 * 文字锚定到标签的真实中心。修复仅作用于渲染后的 SVG，不修改图表源码与
 * 代码视图。
 */
export function alignGitCommitLabels(svg: SVGSVGElement): void {
  if (svg.getAttribute('aria-roledescription') !== 'gitGraph') return;

  const backgrounds = svg.querySelectorAll<SVGRectElement>('rect.commit-label-bkg');
  const labels = svg.querySelectorAll<SVGTextElement>('text.commit-label');
  const pairCount = Math.min(backgrounds.length, labels.length);

  for (let index = 0; index < pairCount; index += 1) {
    const background = backgrounds[index];
    const label = labels[index];
    if (!background || !label || label.dataset.mermaidTextAligned === 'true') continue;

    const x = Number(background.getAttribute('x'));
    const y = Number(background.getAttribute('y'));
    const width = Number(background.getAttribute('width'));
    const height = Number(background.getAttribute('height'));
    if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) continue;

    let labelBounds: DOMRect;
    try {
      labelBounds = label.getBBox();
    } catch {
      continue;
    }

    const centerX = x + width / 2;
    const normalizedWidth = labelBounds.width + GIT_COMMIT_LABEL_INLINE_PADDING;
    const normalizedHeight = labelBounds.height + GIT_COMMIT_LABEL_BLOCK_PADDING;
    // Mermaid's original label starts below the commit node. Expanding around
    // its center would grow the chip upward into the node, so keep that edge
    // and add an explicit gap while allowing the larger chip to grow downward.
    // Mermaid 原始标签位于提交节点下方。若以中心扩容，标签会向上侵入节点；
    // 因此保留下边定位语义并增加明确间距，让更大的标签框向下扩展。
    const normalizedY = y + GIT_COMMIT_LABEL_NODE_GAP;
    const centerY = normalizedY + normalizedHeight / 2;

    background.setAttribute('x', String(centerX - normalizedWidth / 2));
    background.setAttribute('y', String(normalizedY));
    background.setAttribute('width', String(normalizedWidth));
    background.setAttribute('height', String(normalizedHeight));
    label.setAttribute('x', String(centerX));
    label.setAttribute('y', String(centerY));
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'central');
    label.dataset.mermaidTextAligned = 'true';
  }
}

interface GitCommitLayoutItem {
  center: number;
  labelHalfWidth: number;
}

function readSvgNumber(element: Element, attribute: string): number | null {
  const value = Number(element.getAttribute(attribute));
  return Number.isFinite(value) ? value : null;
}

function mapGitInlineCoordinate(
  value: number,
  originalCenters: number[],
  adjustedCenters: number[],
): number {
  if (originalCenters.length === 0 || originalCenters.length !== adjustedCenters.length)
    return value;
  if (originalCenters.length === 1) return value + adjustedCenters[0] - originalCenters[0];
  if (value <= originalCenters[0]) return value + adjustedCenters[0] - originalCenters[0];
  if (value >= originalCenters[originalCenters.length - 1]) {
    const lastIndex = originalCenters.length - 1;
    return value + adjustedCenters[lastIndex] - originalCenters[lastIndex];
  }

  let segment = 0;
  while (segment < originalCenters.length - 2 && value > originalCenters[segment + 1]) {
    segment += 1;
  }

  const sourceStart = originalCenters[segment];
  const sourceEnd = originalCenters[segment + 1];
  const targetStart = adjustedCenters[segment];
  const targetEnd = adjustedCenters[segment + 1];
  const sourceSpan = sourceEnd - sourceStart;
  if (Math.abs(sourceSpan) < Number.EPSILON) return targetStart;

  return targetStart + ((value - sourceStart) / sourceSpan) * (targetEnd - targetStart);
}

function transformGitPathInlineCoordinates(
  path: SVGPathElement,
  originalCenters: number[],
  adjustedCenters: number[],
  inlineAxis: 'x' | 'y',
): void {
  const pathData = path.getAttribute('d');
  if (!pathData) return;

  const tokens = pathData.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  if (!tokens) return;

  const axisIndex = inlineAxis === 'x' ? 0 : 1;
  const adjustedTokens = [...tokens];
  let cursor = 0;
  let command = '';
  const coordinateChunkSize: Record<string, number> = {
    M: 2,
    L: 2,
    T: 2,
    H: 1,
    V: 1,
    C: 6,
    S: 4,
    Q: 4,
    A: 7,
  };

  while (cursor < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[cursor])) {
      command = tokens[cursor];
      cursor += 1;
      if (command === 'Z' || command === 'z') continue;
    }
    if (!command || /[a-z]/.test(command)) return;

    const upperCommand = command;
    const chunkSize = coordinateChunkSize[upperCommand];
    if (!chunkSize) return;
    const remaining = tokens.length - cursor;
    if (
      remaining < chunkSize ||
      tokens.slice(cursor, cursor + chunkSize).some((token) => /^[a-zA-Z]$/.test(token))
    ) {
      return;
    }

    const chunkStart = cursor;
    const coordinateOffsets =
      upperCommand === 'A'
        ? [axisIndex === 0 ? 5 : 6]
        : upperCommand === 'H'
          ? inlineAxis === 'x'
            ? [0]
            : []
          : upperCommand === 'V'
            ? inlineAxis === 'y'
              ? [0]
              : []
            : Array.from({ length: chunkSize / 2 }, (_, index) => index * 2 + axisIndex);
    for (const offset of coordinateOffsets) {
      const tokenIndex = chunkStart + offset;
      const value = Number(tokens[tokenIndex]);
      if (!Number.isFinite(value)) continue;
      adjustedTokens[tokenIndex] = String(
        mapGitInlineCoordinate(value, originalCenters, adjustedCenters),
      );
    }
    cursor += chunkSize;
    if (upperCommand === 'M') command = 'L';
  }

  path.setAttribute('d', adjustedTokens.join(' '));
}

/**
 * Mermaid 11 advances horizontal GitGraph commits by a fixed 50px step even
 * when an unrotated commit label is wider than that step. Use the browser's
 * final glyph metrics to preserve 50px as the minimum distance and enlarge each
 * adjacent interval only when the two labels or commit nodes need more room.
 * Every coordinate-bearing GitGraph layer is remapped through the same
 * piecewise-linear axis, keeping branch tracks and merge arrows connected.
 *
 * Mermaid 11 对横向 GitGraph 提交固定使用 50px 步长，即使未旋转标签远宽于
 * 该步长也不会扩容。这里使用浏览器最终字形度量，以 50px 为最小距离，仅在
 * 相邻标签或提交节点需要更多空间时扩大区间；所有含坐标的 GitGraph 图层通过
 * 同一分段线性坐标轴重映射，确保分支轨道和合并箭头仍与节点准确连接。
 */
export function spaceGitGraphCommits(svg: SVGSVGElement): void {
  if (
    svg.getAttribute('aria-roledescription') !== 'gitGraph' ||
    svg.dataset.mermaidCommitsSpaced === 'true'
  ) {
    return;
  }

  const bullets = Array.from(svg.querySelectorAll<SVGGraphicsElement>('.commit-bullets .commit'));
  if (bullets.length < 2) {
    svg.dataset.mermaidCommitsSpaced = 'true';
    return;
  }

  const firstBranch = svg.querySelector<SVGLineElement>('line.branch');
  const firstBranchX1 = firstBranch ? readSvgNumber(firstBranch, 'x1') : null;
  const firstBranchX2 = firstBranch ? readSvgNumber(firstBranch, 'x2') : null;
  const inlineAxis: 'x' | 'y' =
    firstBranchX1 !== null &&
    firstBranchX2 !== null &&
    Math.abs(firstBranchX1 - firstBranchX2) < 0.01
      ? 'y'
      : 'x';
  const labels = Array.from(svg.querySelectorAll<SVGTextElement>('text.commit-label'));
  const labelWidthsByCenter = new Map<number, number>();
  for (const label of labels) {
    const center = readSvgNumber(label, inlineAxis);
    if (center === null) continue;
    try {
      const bounds = label.getBBox();
      const labelExtent = inlineAxis === 'x' ? bounds.width : bounds.height;
      labelWidthsByCenter.set(center, labelExtent + GIT_COMMIT_LABEL_INLINE_PADDING);
    } catch {
      // Keep the commit-node extent as a safe fallback when text is not measurable.
    }
  }

  const itemsByCenter = new Map<number, GitCommitLayoutItem>();
  for (const bullet of bullets) {
    let bounds: DOMRect;
    try {
      bounds = bullet.getBBox();
    } catch {
      continue;
    }
    const center = inlineAxis === 'x' ? bounds.x + bounds.width / 2 : bounds.y + bounds.height / 2;
    const matchedLabelCenter = Array.from(labelWidthsByCenter.keys()).find(
      (labelCenter) => Math.abs(labelCenter - center) <= GIT_COMMIT_POSITION_TOLERANCE,
    );
    const labelWidth =
      matchedLabelCenter === undefined ? 0 : (labelWidthsByCenter.get(matchedLabelCenter) ?? 0);
    const bulletExtent = inlineAxis === 'x' ? bounds.width : bounds.height;
    const labelHalfWidth = Math.max(labelWidth / 2, bulletExtent / 2, GIT_COMMIT_NODE_HALF_EXTENT);
    itemsByCenter.set(center, {
      center,
      labelHalfWidth: Math.max(itemsByCenter.get(center)?.labelHalfWidth ?? 0, labelHalfWidth),
    });
  }

  const items = Array.from(itemsByCenter.values()).sort(
    (left, right) => left.center - right.center,
  );
  if (items.length < 2) {
    svg.dataset.mermaidCommitsSpaced = 'true';
    return;
  }

  const originalCenters = items.map((item) => item.center);
  const adjustedCenters = [originalCenters[0]];
  for (let index = 1; index < items.length; index += 1) {
    const previous = items[index - 1];
    const current = items[index];
    const originalStep = current.center - previous.center;
    const contentStep =
      previous.labelHalfWidth + current.labelHalfWidth + GIT_COMMIT_MIN_INLINE_GAP;
    adjustedCenters.push(adjustedCenters[index - 1] + Math.max(originalStep, contentStep));
  }

  if (adjustedCenters.every((center, index) => Math.abs(center - originalCenters[index]) < 0.01)) {
    svg.dataset.mermaidCommitsSpaced = 'true';
    return;
  }

  const remapAttribute = (element: Element, attribute: string) => {
    const value = readSvgNumber(element, attribute);
    if (value === null) return;
    element.setAttribute(
      attribute,
      String(mapGitInlineCoordinate(value, originalCenters, adjustedCenters)),
    );
  };
  const getNearestCenterIndex = (value: number) => {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < originalCenters.length; index += 1) {
      const distance = Math.abs(originalCenters[index] - value);
      if (distance >= nearestDistance) continue;
      nearestIndex = index;
      nearestDistance = distance;
    }
    return nearestIndex;
  };
  const translateCoordinate = (element: Element, attribute: string, anchor: number) => {
    const value = readSvgNumber(element, attribute);
    if (value === null) return;
    const index = getNearestCenterIndex(anchor);
    element.setAttribute(
      attribute,
      String(value + adjustedCenters[index] - originalCenters[index]),
    );
  };
  const translateGraphicsElement = (element: SVGGraphicsElement, anchor: number) => {
    const index = getNearestCenterIndex(anchor);
    const delta = adjustedCenters[index] - originalCenters[index];
    if (Math.abs(delta) < 0.01) return;
    const translation = inlineAxis === 'x' ? `translate(${delta} 0)` : `translate(0 ${delta})`;
    const existingTransform = element.getAttribute('transform');
    element.setAttribute(
      'transform',
      `${translation}${existingTransform ? ` ${existingTransform}` : ''}`,
    );
  };

  for (const line of svg.querySelectorAll<SVGLineElement>('line.branch')) {
    remapAttribute(line, inlineAxis === 'x' ? 'x1' : 'y1');
    remapAttribute(line, inlineAxis === 'x' ? 'x2' : 'y2');
  }
  for (const bullet of bullets) {
    const bounds = bullet.getBBox();
    const anchor = inlineAxis === 'x' ? bounds.x + bounds.width / 2 : bounds.y + bounds.height / 2;
    translateGraphicsElement(bullet, anchor);
  }
  const commitLabelBackgrounds = Array.from(
    svg.querySelectorAll<SVGRectElement>('rect.commit-label-bkg'),
  );
  const commitLabels = Array.from(svg.querySelectorAll<SVGTextElement>('text.commit-label'));
  const commitLabelPairs = Math.min(commitLabelBackgrounds.length, commitLabels.length);
  const inlineAttribute = inlineAxis === 'x' ? 'x' : 'y';
  for (let index = 0; index < commitLabelPairs; index += 1) {
    const background = commitLabelBackgrounds[index];
    const label = commitLabels[index];
    const labelAnchor = readSvgNumber(label, inlineAttribute);
    if (labelAnchor === null) continue;
    const centerIndex = getNearestCenterIndex(labelAnchor);
    const delta = adjustedCenters[centerIndex] - originalCenters[centerIndex];
    const backgroundAnchor = readSvgNumber(background, inlineAttribute);
    if (backgroundAnchor !== null) {
      background.setAttribute(inlineAttribute, String(backgroundAnchor + delta));
    }
    label.setAttribute(inlineAttribute, String(labelAnchor + delta));
  }
  for (const element of svg.querySelectorAll<SVGElement>('text.tag-label, circle.tag-hole')) {
    const anchor = readSvgNumber(element, inlineAttribute);
    if (anchor !== null) translateCoordinate(element, inlineAttribute, anchor);
  }
  for (const polygon of svg.querySelectorAll<SVGPolygonElement>('polygon.tag-label-bkg')) {
    const bounds = polygon.getBBox();
    const anchor = inlineAxis === 'x' ? bounds.x + bounds.width / 2 : bounds.y + bounds.height / 2;
    translateGraphicsElement(polygon, anchor);
  }
  for (const arrow of svg.querySelectorAll<SVGPathElement>('.commit-arrows path.arrow')) {
    transformGitPathInlineCoordinates(arrow, originalCenters, adjustedCenters, inlineAxis);
  }

  svg.dataset.mermaidCommitsSpaced = 'true';
}

function alignGitGraphLabels(svg: SVGSVGElement): void {
  alignGitBranchLabels(svg);
  alignGitCommitLabels(svg);
  spaceGitGraphCommits(svg);
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
  normalizeFlowchartClusterLabels(svg);
  normalizeSequenceNotes(svg);
  normalizeTimeline(svg);
  alignGitGraphLabels(svg);
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
  normalizeFlowchartClusterLabels(svg);
  normalizeSequenceNotes(svg);
  normalizeTimeline(svg);
  alignGitGraphLabels(svg);
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
