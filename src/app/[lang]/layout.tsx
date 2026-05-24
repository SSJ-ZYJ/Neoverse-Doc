// Locale-aware layout. RootProvider is fed by i18nProvider(i18nUI, lang) (the
// official fumadocs API) which carries both `translations` and the `locales`
// array — the latter is what makes the language switcher auto-render.
// 语言感知布局。RootProvider 接收 i18nProvider(i18nUI, lang)（fumadocs 官方 API），
// 其内含 translations + locales 数组；locales 是语言切换器自动渲染的前提。

import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import DefaultSearchDialog from '@/components/search';
import { getPageDictionary } from '@/dictionaries';
import { i18n, type Locale } from '@/lib/i18n';
import { i18nProvider, i18nUI } from '@/lib/layout.shared';

export function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}

export async function generateMetadata(props: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await props.params;
  const locale = (lang as Locale) ?? i18n.defaultLanguage;
  const dict = getPageDictionary(locale);

  return {
    title: 'Neoverse',
    description: dict.tagline,
  };
}

export default async function LangLayout({ params, children }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  const locale = (lang as Locale) ?? i18n.defaultLanguage;

  return (
    <RootProvider
      search={{
        SearchDialog: DefaultSearchDialog,
      }}
      i18n={i18nProvider(i18nUI, locale)}
    >
      {children}
    </RootProvider>
  );
}
