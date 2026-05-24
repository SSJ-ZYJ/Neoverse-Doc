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
  communityTitle: 'Community',
  communityDesc: 'Welcome to share your thoughts and feedback',
  backToDocs: 'Back to Docs',
} as const;
