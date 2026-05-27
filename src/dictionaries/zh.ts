// Page-level custom copy (NOT fumadocs UI translations).
// fumadocs-ui internal labels live in src/lib/layout.shared.tsx via defineI18nUI.
// This dictionary only holds tagline / nav text / etc. consumed by app pages.
// 页面自定义文案（非 fumadocs UI 翻译）。
// fumadocs-ui 内部 UI 文案由 src/lib/layout.shared.tsx 的 defineI18nUI 管理。
// 本字典只承载页面用到的 副标题 / 导航栏名 / 卡片标题等业务文案。

export const zh = {
  tagline: '一份还在做的文档',
  enterDocs: '进入文档',
  guestbookTitle: '留言板',
  guestbookDesc: '在这里留下你对 Neoverse-Doc 的足迹与反馈',
  communityTitle: '讨论区',
  communityDesc: '欢迎分享你的想法与反馈',
  backToDocs: '返回文档',
  errorTitle: '页面加载失败',
  errorDesc: '发生了意外错误，请尝试重新加载页面。',
  errorRetry: '重试',
} as const;
