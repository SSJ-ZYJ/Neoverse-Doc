// Fumadocs UI translations + locale-aware base layout options.
// Follows the official i18n pattern documented at
// https://www.fumadocs.dev/docs/internationalization/next:
//   - `i18n.translations().extend(uiTranslations()).add('ui', {...})` declares fumadocs-ui internal labels.
//   - `i18nProvider(i18nUI, lang)` is fed into <RootProvider i18n={...} />, which
//     also drives the auto-rendered language switcher (needs `locales` array).
//   - `baseOptions(locale)` produces nav links per locale for DocsLayout/HomeLayout.
// 按 fumadocs 官方推荐的 i18n 模式：
//   - i18n.translations().extend(uiTranslations()).add('ui', {...}) 声明 fumadocs-ui 内部文案；
//   - i18nProvider(i18nUI, lang) 注入 <RootProvider i18n={...} />，自动渲染语言切换器（依赖 locales 数组）；
//   - baseOptions(locale) 按语言生成 DocsLayout / HomeLayout 导航链接。

import { i18nProvider, uiTranslations } from 'fumadocs-ui/i18n';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { getPageDictionary } from '@/dictionaries';
import { i18n, type Locale } from '@/lib/i18n';

export const i18nUI = i18n
  .translations()
  .extend(uiTranslations())
  .add('ui', {
    zh: {
      displayName: '中文',
      search: '搜索',
      searchNoResult: '未找到结果',
      toc: '本页目录',
      tocNoHeadings: '无标题',
      tocInline: '目录',
      lastUpdate: '最后更新于',
      chooseLanguage: '选择语言',
      nextPage: '下一页',
      previousPage: '上一页',
      chooseTheme: '主题',
      editOnGithub: '在 GitHub 上编辑',
      themeLight: '浅色',
      themeDark: '深色',
      themeSystem: '跟随系统',
      codeBlockCopy: '复制',
      codeBlockCopied: '已复制',
      accordionCopyAnchor: '复制链接',
      headingCopyAnchor: '复制锚点链接',
      bannerClose: '关闭横幅',
      searchOpen: '打开搜索',
      searchClose: '关闭搜索',
      menuToggle: '切换菜单',
      themeToggle: '切换主题',
      sidebarOpen: '打开侧栏',
      sidebarCollapse: '折叠侧栏',
      notFoundTitle: '页面未找到',
      notFoundDescription: '你访问的页面可能已被移除、重命名或暂时不可用。',
      notFoundLink: '返回首页',
    },
    en: {
      displayName: 'English',
    },
  });

export { i18nProvider };

export function baseOptions(locale: Locale = i18n.defaultLanguage): BaseLayoutProps {
  const dict = getPageDictionary(locale);

  return {
    nav: {
      title: <span className="font-orbitron font-bold text-xl tracking-wider">Neoverse-Doc</span>,
      url: `/${locale}`,
    },
    links: [
      {
        text: dict.guestbookTitle,
        url: `/${locale}/guestbook`,
      },
    ],
  };
}
