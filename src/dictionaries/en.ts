// Page-level custom copy (NOT fumadocs UI translations).
// fumadocs-ui internal labels live in src/lib/layout.shared.tsx via defineI18nUI.
// This dictionary only holds tagline / nav text / etc. consumed by app pages.
// 页面自定义文案（非 fumadocs UI 翻译）。
// fumadocs-ui 内部 UI 文案由 src/lib/layout.shared.tsx 的 defineI18nUI 管理。
// 本字典只承载页面用到的 副标题 / 导航栏名 / 卡片标题等业务文案。

import type { Dictionary } from './index';

export const en = {
  siteTitle: 'Neoverse-Docs',
  tagline: 'An open knowledge network for computer science learners',
  loading: 'Loading…',
  // Visual loading marquee label.
  // 可视化加载跑马灯标签。
  loadingMarquee: 'LOADING...',
  enterDocs: 'Enter',
  guestbookTitle: 'Guestbook',
  guestbookDesc: 'Leave your suggestions and feedback for Neoverse-Docs here',
  communityTitle: 'Discussion',
  communityDesc: 'Welcome to share your thoughts and suggestions',
  primaryAuthorLabel: 'Primary author:',
  documentContributorsTitle: 'Document contributors',
  pageActionsLabel: 'More',
  // Page actions menu item labels / 页面操作菜单项文案
  pageActionsViewSource: 'View source',
  pageActionsOpenGithub: 'Open in GitHub',
  backToDocs: 'Back to Docs',
  backToHome: 'Back to Home',
  // Search scope labels / 搜索范围标签
  searchScopeLabel: 'Search scope',
  searchAllChapters: 'All chapters',
  // Cross-document reading return labels / 跨文档阅读返回标签
  readingReturnAction: 'Return to reading position',
  readingReturnAriaLabel: 'Return to your reading position in “{title}”',
  // Route error recovery copy / 路由错误恢复文案
  errorTitle: 'Page Failed to Load',
  errorCode: '500',
  errorDesc: 'An unexpected error occurred. Please try reloading the page.',
  errorRetry: 'Retry',
  notFoundTitle: 'Page Not Found',
  notFoundCode: '404',
  notFoundDesc:
    'The page you are looking for might have been removed, renamed, or temporarily unavailable.',
  notFoundBack: 'Go Back',
  notFoundHome: 'Back to Home',
  notFoundDocs: 'Enter Docs',
  // Draft document gate labels / 草稿文档门禁文案
  draftBadge: 'Under construction',
  draftTitle: 'This document is still being written',
  draftDescription:
    'We are still writing, testing, and smoothing out the rough edges. Head back to the previous page, or peek behind the barrier to see how far the work has come.',
  draftPrevious: 'Read the previous page',
  draftHome: 'Back to the knowledge map',
  draftReveal: 'Just one quick peek 👀',
  draftUnlocked: 'Draft content unlocked.',
  // Homepage portal copy / 首页内容门户文案
  home: {
    eyebrow: 'Open knowledge network · Always evolving',
    heroDescription:
      'From computer fundamentals to algorithm practice, connect scattered experience into clear, searchable, and collaborative learning paths.',
    scrollHint: 'Explore the knowledge map',
    chaptersEyebrow: 'Knowledge coordinates',
    chaptersTitle: 'Start with real chapters',
    chaptersDescription:
      'These entries come directly from the current documentation tree and evolve with it.',
    chapterAction: 'Open chapter',
    communityEyebrow: 'Built together',
    communityTitle: 'Help the knowledge network grow',
    communityDescription:
      'Found an error, a missing path, or a clearer explanation? Start a discussion or contribute directly.',
    communityPrimaryAction: 'Contribute',
    communitySecondaryAction: 'Visit guestbook',
  },
  // Homepage footer labels / 首页 footer 标签
  homeFooterLabel: 'Project footer',
  homeFooterCode: 'Project code',
  homeFooterOpenSource: 'open sourced',
  homeFooterCommit: 'Commit',
  homeFooterLastCommit: 'Last commit',
  homeFooterAuthor: 'Author',
  homeFooterUnavailable: 'Unknown',
  // Homepage footer license labels / 首页 footer 协议标签
  homeFooterCodeLicenseLabel: 'Source code license',
  homeFooterDocsLicenseLabel: 'Docs license',
  // Interactive Markdown task-list labels / 可交互 Markdown 任务清单标签
  taskListComplete: 'Mark “{title}” as completed',
  taskListReopen: 'Move “{title}” back to active',
  taskListItem: 'Task item',
  taskListProgressTitle: 'TODO progress',
  taskListProgressLabel: 'TODO progress: {completed} of {total} completed',
  taskListCompletedCount: 'Completed',
  taskListTotalCount: 'Total',
  taskListJumpToList: 'View tasks',
  // Mermaid toolbar a11y labels / Mermaid 工具栏无障碍标签
  mermaidZoomOut: 'Zoom out',
  mermaidZoomIn: 'Zoom in',
  mermaidReset: 'Reset zoom',
  mermaidMaximize: 'Maximize',
  mermaidRestore: 'Restore',
  mermaidToolbar: 'Diagram toolbar',
  // Mermaid view mode toggle labels / Mermaid 视图模式切换标签
  mermaidViewMode: 'Mermaid view mode',
  mermaidViewRender: 'Rendered view',
  mermaidViewCode: 'Code view',
  mermaidSourceCode: 'Mermaid source code',
} satisfies Dictionary;
