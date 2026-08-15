// Fumadocs UI translations + locale-aware base layout options.
// Follows the official i18n pattern documented at
// https://www.fumadocs.dev/docs/internationalization/next:
//   - `i18n.translations().extend(uiTranslations()).add('ui', {...})` declares fumadocs-ui internal labels.
//   - `i18nProvider(i18nUI, lang)` is fed into <RootProvider i18n={...} />, which
//     also drives the auto-rendered language switcher (needs `locales` array).
//   - `baseOptions(locale, inputs)` produces nav links per locale for DocsLayout/HomeLayout.
//     Product pieces (nav title node, guestbook label) are injected by callers so
//     this adapter stays free of components/dictionaries dependencies.
// 按 fumadocs 官方推荐的 i18n 模式：
//   - i18n.translations().extend(uiTranslations()).add('ui', {...}) 声明 fumadocs-ui 内部文案；
//   - i18nProvider(i18nUI, lang) 注入 <RootProvider i18n={...} />，自动渲染语言切换器（依赖 locales 数组）；
//   - baseOptions(locale, inputs) 按语言生成 DocsLayout / HomeLayout 导航链接。
//     产品侧内容（导航标题节点、留言墙文案）由调用方注入，适配器不依赖 components/dictionaries。
import {
  type Translations as FumadocsUITranslations,
  i18nProvider,
  uiTranslations,
} from 'fumadocs-ui/i18n';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import type { ReactNode } from 'react';
import { i18n, type Locale } from '@/lib/i18n';

// Type-checked Chinese labels for fumadocs-ui's Fuma Translate keys.
// The keys intentionally match fumadocs-ui labels, so built-in UI falls back to Chinese instead of English.
// fumadocs-ui 的 Fuma Translate key 中文标签，带类型约束。
// key 需与 fumadocs-ui 标签保持一致，确保内置 UI 使用中文而不是回退英文。
// New keys added for fumadocs-ui 16.13.x:
//   - Ask AI / Close Sidebar / Show Sidebar / Hide Sidebar: sidebar toggle & AI chat entry in glass/flux layouts
//   - Layout Tab: layout switcher trigger in glass layout tabs
// 为 fumadocs-ui 16.13.x 新增的 key：
//   - Ask AI / Close Sidebar / Show Sidebar / Hide Sidebar：glass/flux 布局中的侧栏开关与 AI 聊天入口
//   - Layout Tab：glass 布局中的布局切换触发器
const zhUITranslations = {
  'Ask AI(AI chat button)': '询问 AI',
  'Back to Home(404 page)': '返回首页',
  'Choose a language(language switcher)': '选择语言',
  'Choose a language(language switcher)(aria-label)': '选择语言',
  'Close Banner(banner)(aria-label)': '关闭横幅',
  'Close Search(search dialog)(aria-label)': '关闭搜索',
  'Close Sidebar(aria-label)': '关闭侧栏',
  'Close Sidebar(sidebar)(aria-label)': '关闭侧栏',
  'Collapse Sidebar(sidebar)(aria-label)': '折叠侧栏',
  'Copied Text(code block)(aria-label)': '已复制',
  'Copy Anchor Link(heading anchor)(aria-label)': '复制锚点链接',
  'Copy Link(accordion)(aria-label)': '复制链接',
  'Copy Markdown(page actions)': '复制 Markdown',
  'Copy Text(code block)(aria-label)': '复制',
  'Dark(theme switcher)(aria-label)': '深色',
  'Default(type table)': '默认值',
  'Edit on GitHub(edit page)': '在 GitHub 上编辑',
  'Hide Sidebar(sidebar)': '隐藏侧栏',
  'Last updated on(page footer)': '最后更新于',
  'Layout Tab(layout tab trigger)': '布局选项卡',
  'Light(theme switcher)(aria-label)': '浅色',
  'Next Page(pagination)': '下一页',
  'No Headings(table of contents)': '无标题',
  'No results found(search dialog)': '未找到结果',
  'On this page(table of contents)': '本页目录',
  'Open Search(search trigger)(aria-label)': '打开搜索',
  'Open Sidebar(sidebar)(aria-label)': '打开侧栏',
  'Open in ChatGPT(page actions)': '在 ChatGPT 中打开',
  'Open in Claude(page actions)': '在 Claude 中打开',
  'Open in Cursor(page actions)': '在 Cursor 中打开',
  'Open in GitHub(page actions)': '在 GitHub 中打开',
  'Open in Scira AI(page actions)': '在 Scira AI 中打开',
  'Open(page actions)': '打开',
  'Page Not Found(404 page)': '页面未找到',
  'Parameters(type table)': '参数',
  'Previous Page(pagination)': '上一页',
  'Prop(type table)': '属性',
  'Read {url}, I want to ask questions about it.(page actions)': '阅读 {url}，我想围绕它提问。',
  'Returns(type table)': '返回值',
  'Search(search dialog)': '搜索文档',
  'Search(search trigger)': '搜索',
  'Show Sidebar(sidebar)': '显示侧栏',
  'System(theme switcher)(aria-label)': '跟随系统',
  'Table of Contents(inline table of contents)': '目录',
  'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.(404 page)':
    '你访问的页面可能已被移除、重命名或暂时不可用。',
  'Toggle Menu(mobile menu)(aria-label)': '切换菜单',
  'Toggle Theme(theme switcher)(aria-label)': '切换主题',
  'Type(type table)': '类型',
  'View as Markdown(page actions)': '查看源码',
  displayName: '中文',
} satisfies FumadocsUITranslations;

export const i18nUI = i18n
  .translations()
  .extend(uiTranslations())
  .add('ui', {
    zh: zhUITranslations,
    en: {
      displayName: 'English',
    },
  });

export { i18nProvider };

// Product pieces injected by app-layer callers: keeps this adapter on the
// framework seam only (fumadocs-ui + lib), never reaching components/dictionaries.
// 由 app 层调用方注入的产品内容：适配器只留在框架接缝（fumadocs-ui + lib），
// 不再触达 components / dictionaries。
export interface BaseOptionsInputs {
  navTitle: ReactNode;
  guestbookTitle: string;
}

export function baseOptions(
  locale: Locale = i18n.defaultLanguage,
  inputs: BaseOptionsInputs,
): BaseLayoutProps {
  return {
    nav: {
      title: inputs.navTitle,
      url: `/${locale}`,
    },
    themeSwitch: {
      mode: 'light-dark-system',
    },
    links: [
      {
        text: inputs.guestbookTitle,
        url: `/${locale}/guestbook`,
        active: 'nested-url',
      },
    ],
  };
}
