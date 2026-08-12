import type { MermaidConfig } from 'mermaid';

// Metric-sensitive label styles must be present while Mermaid measures its
// temporary SVG. Applying them only after injection can shift baselines or make
// an already-measured foreignObject clip its text.
// 影响文字度量的标签样式必须在 Mermaid 测量临时 SVG 时就已生效；若仅在注入后
// 应用，会导致基线偏移，或使已完成测量的 foreignObject 裁剪文字。
const MERMAID_METRIC_THEME_CSS = `
  .cluster-label {
    font-weight: 680;
  }

  .branchLabel text,
  .branchLabel tspan,
  .commit-label {
    font-weight: 750;
  }

  svg[aria-roledescription='timeline'] .timeline-node text {
    font-size: 18px;
    font-weight: 650;
  }

  svg[aria-roledescription='timeline'] > text {
    font-size: 24px;
    font-weight: 750;
  }

  foreignObject,
  .node foreignObject {
    overflow: visible;
  }

  foreignObject div,
  .nodeLabel,
  .nodeLabel p {
    line-height: 1.2;
    margin: 0;
    overflow: visible;
  }
`;

// Shared by the build-time renderer and the client fallback so both paths
// produce the same diagram geometry and presentation.
// 构建期渲染与客户端兜底共用同一配置，保证两条路径的图形几何和表现一致。
export const MERMAID_CONFIG = {
  startOnLoad: false,
  theme: 'base',
  fontFamily: 'inherit',
  themeCSS: MERMAID_METRIC_THEME_CSS,
  flowchart: {
    htmlLabels: true,
    useMaxWidth: false,
  },
  // Gantt reads its parent width while Mermaid renders in a temporary
  // off-screen container. Use a stable intrinsic width so long pages cannot
  // produce a several-thousand-pixel viewBox.
  // 甘特图会在离屏临时容器中读取父级宽度；使用稳定固有宽度，避免长页面
  // 生成数千像素的 viewBox。
  gantt: {
    fontSize: 12,
    sectionFontSize: 12,
    useMaxWidth: false,
    useWidth: 640,
  },
  // Fixed intrinsic output prevents Git-specific layout from being measured
  // against a transient 0px host.
  // 固有尺寸输出避免 Git 专用布局在临时 0px 宿主中被错误测量。
  gitGraph: {
    rotateCommitLabel: false,
    useMaxWidth: false,
  },
  sequence: {
    useMaxWidth: false,
  },
  timeline: {
    padding: 32,
    useMaxWidth: false,
  },
  themeVariables: {
    background: 'transparent',
    commitLabelFontSize: '12px',
    fontFamily: 'inherit',
    tagLabelFontSize: '12px',
  },
} satisfies MermaidConfig;
