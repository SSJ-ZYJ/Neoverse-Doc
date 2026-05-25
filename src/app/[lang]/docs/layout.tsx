// Docs layout: pulls the locale-specific page tree because fumadocs i18n
// exposes source.pageTree as Record<lang, Root> when i18n is enabled.
// baseOptions(locale) comes from the shared layout config (lib/layout.shared).
// 文档布局：i18n 启用后 source.pageTree 为 Record<lang, Root>，所以需要按 lang 取子树。
// baseOptions(locale) 来源于 lib/layout.shared 中的共享布局配置。

import { DocsLayout } from 'fumadocs-ui/layouts/docs';
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
    <DocsLayout tree={source.pageTree[locale]} {...baseOptions(locale)}>
      {children}
    </DocsLayout>
  );
}
