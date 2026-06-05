// Page-level custom copy (NOT fumadocs UI translations).
// fumadocs-ui internal labels live in src/lib/layout.shared.tsx via defineI18nUI.
// This dictionary only holds tagline / nav text / etc. consumed by app pages.
// 页面自定义文案（非 fumadocs UI 翻译）。
// fumadocs-ui 内部 UI 文案由 src/lib/layout.shared.tsx 的 defineI18nUI 管理。
// 本字典只承载页面用到的 副标题 / 导航栏名 / 卡片标题等业务文案。

export const en = {
  tagline: 'A work in progress documentation',
  enterDocs: 'Enter',
  guestbookTitle: 'Guestbook',
  guestbookDesc: 'Leave your footprints and feedback for Neoverse-Doc here',
  communityTitle: 'Discussion',
  communityDesc: 'Welcome to share your thoughts and feedback',
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
  // Mermaid toolbar a11y labels / Mermaid 工具栏无障碍标签
  mermaidZoomOut: 'Zoom out',
  mermaidZoomIn: 'Zoom in',
  mermaidReset: 'Reset zoom',
  mermaidMaximize: 'Maximize',
  mermaidRestore: 'Restore',
  mermaidToolbar: 'Diagram toolbar',
} as const;
