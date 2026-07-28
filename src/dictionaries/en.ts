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
  backToDocs: 'Back to Docs',
  backToHome: 'Back to Home',
  errorTitle: 'Page Failed to Load',
  errorDesc: 'An unexpected error occurred. Please try reloading the page.',
  errorRetry: 'Retry',
  notFoundTitle: 'Page Not Found',
  notFoundCode: '404',
  notFoundDesc:
    'The page you are looking for might have been removed, renamed, or temporarily unavailable.',
  notFoundBack: 'Go Back',
  notFoundHome: 'Back to Home',
  notFoundDocs: 'Enter Docs',
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
    learningEyebrow: 'Learning navigator',
    learningTitle: 'Turn a broad major into reachable next steps',
    learningDescription:
      'For computer science and related majors, build reliable study and problem-solving habits from daily tools to engineering practice.',
    learningPaths: [
      {
        title: 'Computing foundations',
        description: 'Understand everyday computing through files, systems, and browsers.',
      },
      {
        title: 'Development tools',
        description: 'Build confidence with terminals, text editing, and version control.',
      },
      {
        title: 'Engineering first steps',
        description: 'Connect environments, containers, and collaboration into reusable methods.',
      },
      {
        title: 'Clear expression',
        description: 'Use Markdown, Mermaid, and code examples to keep useful notes.',
      },
      {
        title: 'Problem solving',
        description: 'Practice searching, asking, and validating to turn blockers into actions.',
      },
      {
        title: 'Learning together',
        description: 'Discuss, correct, and preserve experience beside the relevant guide.',
      },
    ],
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
  mermaidCodeEditor: 'Mermaid code editor',
} satisfies Dictionary;
