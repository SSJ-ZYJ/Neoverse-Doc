// Docs layout: pulls the locale-specific page tree because fumadocs i18n
// exposes source.pageTree as Record<lang, Root> when i18n is enabled.
// baseOptions(locale) comes from the shared layout config (lib/layout.shared).
// Custom SidebarProvider wrapper is injected for collapsed state persistence via localStorage.
// 文档布局：i18n 启用后 source.pageTree 为 Record<lang, Root>，所以需要按 lang 取子树。
// baseOptions(locale) 来源于 lib/layout.shared 中的共享布局配置。
// 通过 slots.sidebar.provider 注入自定义 SidebarProvider 包装器以持久化折叠状态到 localStorage。

import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { Sidebar, SidebarTrigger, useSidebar } from 'fumadocs-ui/layouts/docs/slots/sidebar';
import { DocsThemeAndMotionSettings } from '@/components/docs-motion-settings';
import { DocsReadingReturn } from '@/components/docs-reading-return';
import { DocsSidebarSeparator } from '@/components/docs-sidebar-separator';
import { SidebarProvider } from '@/components/sidebar-provider';
import { getPageDictionary } from '@/dictionaries';
import { generateLocaleStaticParams, resolveLocale } from '@/lib/i18n';
import { baseOptions } from '@/lib/layout.shared';
import { REPO_URL } from '@/lib/site-config';
import { source } from '@/lib/source';

export const generateStaticParams = generateLocaleStaticParams;

export default async function Layout({ params, children }: LayoutProps<'/[lang]/docs'>) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const dict = getPageDictionary(locale);

  return (
    <DocsLayout
      tree={source.pageTree[locale]}
      {...baseOptions(locale)}
      // Fumadocs renders the repository as its native sidebar icon link.
      // Fumadocs 使用原生侧栏图标链接呈现项目仓库入口。
      githubUrl={REPO_URL}
      // The official page-tree slot gives section separators a stable styling hook.
      // 官方页面树插槽为分组标题提供稳定的样式标记。
      sidebar={{
        components: {
          Separator: DocsSidebarSeparator,
        },
      }}
      slots={{
        themeSwitch: DocsThemeAndMotionSettings,
        sidebar: {
          provider: SidebarProvider,
          root: Sidebar,
          trigger: SidebarTrigger,
          useSidebar,
        },
      }}
    >
      {children}
      {/* The persistent docs layout tracks body-link return points across page changes.
          持久化文档布局负责在页面切换间追踪正文链接的阅读返回点。 */}
      <DocsReadingReturn
        actionLabel={dict.readingReturnAction}
        ariaLabelTemplate={dict.readingReturnAriaLabel}
        dismissLabel={dict.readingReturnDismiss}
      />
    </DocsLayout>
  );
}
