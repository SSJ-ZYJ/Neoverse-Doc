/**
 * Re-exports the project file hierarchy components for the MDX Preview VSCode extension.
 * The extension cannot auto-detect project components (it only ships shims for Docusaurus,
 * Starlight, Nextra, Next.js), so `.mdx-previewrc.json` points here to provide
 * <File>, <Files>, <Folder> in the preview runtime.
 *
 * 为 MDX Preview VSCode 扩展重新导出项目的文件层级组件。
 * 该扩展无法自动识别项目组件（仅内置 Docusaurus、Starlight、Nextra、Next.js 的 shim），
 * 因此通过 `.mdx-previewrc.json` 指向此文件，在预览运行时提供
 * <File>、<Files>、<Folder> 组件。
 */
export { File, Files, Folder } from './files';
