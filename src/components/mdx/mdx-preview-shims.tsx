/**
 * Re-exports project-specific components for the MDX Preview VSCode extension.
 * The extension cannot auto-detect project components (it only ships shims for Docusaurus,
 * Starlight, Nextra, Next.js), so `.mdx-previewrc.json` points here to provide
 * document cards and file hierarchy components in the preview runtime.
 *
 * 为 MDX Preview VSCode 扩展重新导出项目自定义组件。
 * 该扩展无法自动识别项目组件（仅内置 Docusaurus、Starlight、Nextra、Next.js 的 shim），
 * 因此通过 `.mdx-previewrc.json` 指向此文件，在预览运行时提供文档卡片与文件层级组件。
 */
export {
  DocCard,
  DocGrid,
  FeatureCard,
  LearningPath,
  ResourceLink,
} from './doc-cards';
export { File, Files, Folder } from './files';
