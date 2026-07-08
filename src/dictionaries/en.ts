// Page-level custom copy (NOT fumadocs UI translations).
// fumadocs-ui internal labels live in src/lib/layout.shared.tsx via defineI18nUI.
// This dictionary only holds tagline / nav text / etc. consumed by app pages.
// 页面自定义文案（非 fumadocs UI 翻译）。
// fumadocs-ui 内部 UI 文案由 src/lib/layout.shared.tsx 的 defineI18nUI 管理。
// 本字典只承载页面用到的 副标题 / 导航栏名 / 卡片标题等业务文案。

import type { Dictionary } from './index';

export const en = {
  siteTitle: 'Neoverse-Docs',
  tagline: 'A documentation for CSers',
  loading: 'Loading…',
  loadingMarquee: 'Loading...',
  enterDocs: 'Enter',
  guestbookTitle: 'Guestbook',
  guestbookDesc: 'Leave your suggestions and feedback for Neoverse-Docs here',
  communityTitle: 'Discussion',
  communityDesc: 'Welcome to share your thoughts and suggestions',
  primaryAuthorLabel: 'Primary author:',
  documentContributorsTitle: 'Document contributors',
  backToDocs: 'Back to Docs',
  errorTitle: 'Page Failed to Load',
  errorDesc: 'An unexpected error occurred. Please try reloading the page.',
  errorRetry: 'Retry',
  notFoundTitle: 'Page Not Found',
  notFoundDesc:
    'The page you are looking for might have been removed, renamed, or temporarily unavailable.',
  notFoundBack: 'Go Back',
  notFoundHome: 'Back to Home',
  // Homepage footer labels / 首页 footer 标签
  homeFooterLabel: 'Project footer',
  homeFooterCode: 'Project code',
  homeFooterOpenSource: 'open sourced',
  homeFooterCommit: 'Commit',
  homeFooterLastCommit: 'Last commit',
  homeFooterAuthor: 'Author',
  homeFooterUnavailable: 'Unknown',
  // Mermaid toolbar a11y labels / Mermaid 工具栏无障碍标签
  mermaidZoomOut: 'Zoom out',
  mermaidZoomIn: 'Zoom in',
  mermaidReset: 'Reset zoom',
  mermaidMaximize: 'Maximize',
  mermaidRestore: 'Restore',
  mermaidToolbar: 'Diagram toolbar',
} satisfies Dictionary;
