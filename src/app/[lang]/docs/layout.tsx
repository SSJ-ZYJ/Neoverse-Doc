// Docs layout: pulls the locale-specific page tree because fumadocs i18n
// exposes source.pageTree as Record<lang, Root> when i18n is enabled.
// baseOptions(locale) comes from the shared layout config (lib/layout.shared).
// Custom SidebarProvider wrapper is injected for collapsed state persistence via localStorage.
// 文档布局：i18n 启用后 source.pageTree 为 Record<lang, Root>，所以需要按 lang 取子树。
// baseOptions(locale) 来源于 lib/layout.shared 中的共享布局配置。
// 通过 slots.sidebar.provider 注入自定义 SidebarProvider 包装器以持久化折叠状态到 localStorage。

import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { Sidebar, SidebarTrigger, useSidebar } from 'fumadocs-ui/layouts/docs/slots/sidebar';
import { SidebarProvider } from '@/components/sidebar-provider';
import MaskReveal from '@/components/transition/mask-reveal';
import { i18n, type Locale } from '@/lib/i18n';
import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';

export function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}

export default async function Layout({ params, children }: LayoutProps<'/[lang]/docs'>) {
  const { lang } = await params;
  const locale = (lang as Locale) ?? i18n.defaultLanguage;

  return (
    <>
      <MaskReveal />
      <DocsLayout
        tree={source.pageTree[locale]}
        {...baseOptions(locale)}
        slots={{
          sidebar: {
            provider: SidebarProvider,
            root: Sidebar,
            trigger: SidebarTrigger,
            useSidebar,
          },
        }}
      >
        {children}
      </DocsLayout>
    </>
  );
}
