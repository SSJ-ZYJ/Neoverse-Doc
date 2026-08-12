// Locale-aware layout. RootProvider is fed by i18nProvider(i18nUI, lang) (the
// official fumadocs API) which carries both `translations` and the `locales`
// array — the latter is what makes the language switcher auto-render.
// 语言感知布局。RootProvider 接收 i18nProvider(i18nUI, lang)（fumadocs 官方 API），
// 其内含 translations + locales 数组；locales 是语言切换器自动渲染的前提。

import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { DocumentLanguageSetter } from '@/components/document-language';
import { GuestbookReturnTracker } from '@/components/guestbook-return';
import DefaultSearchDialog from '@/components/search';
import { SearchSpotlight } from '@/components/search-spotlight';
import { TransitionProvider } from '@/components/transition/transition-provider';
import { getPageDictionary } from '@/dictionaries';
import { getSearchChapterTags } from '@/lib/home-sections';
import {
  generateLocaleStaticParams,
  LANGUAGE_TAGS,
  OPEN_GRAPH_LOCALES,
  resolveLocale,
} from '@/lib/i18n';
import { i18nProvider, i18nUI } from '@/lib/layout.shared';
import { getHomeAlternates } from '@/lib/seo';
import { SOCIAL_IMAGE } from '@/lib/site-config';

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata(props: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await props.params;
  const locale = resolveLocale(lang);
  const dict = getPageDictionary(locale);

  return {
    title: {
      default: dict.siteTitle,
      template: `%s - ${dict.siteTitle}`,
    },
    description: dict.tagline,
    alternates: getHomeAlternates(locale),
    openGraph: {
      type: 'website',
      url: `/${locale}`,
      title: dict.siteTitle,
      description: dict.tagline,
      siteName: dict.siteTitle,
      locale: OPEN_GRAPH_LOCALES[locale],
      alternateLocale: Object.values(OPEN_GRAPH_LOCALES).filter(
        (candidate) => candidate !== OPEN_GRAPH_LOCALES[locale],
      ),
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.siteTitle,
      description: dict.tagline,
      images: [SOCIAL_IMAGE],
    },
  };
}

export default async function LangLayout({ params, children }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const dict = getPageDictionary(locale);

  // Search scopes come from the localized Fumadocs page tree; the empty tag keeps
  // the initial scope on all chapters while the remaining tags select one chapter.
  // 搜索范围来自本地化 Fumadocs 页面树；空标签默认搜索全部章节，其余标签限定单章。
  const searchTags = [{ name: dict.searchAllChapters, value: '' }, ...getSearchChapterTags(locale)];
  const documentLanguage = LANGUAGE_TAGS[locale];

  return (
    <>
      {/* The shared root layout stays mounted across locale changes. A client
          effect keeps <html lang> in sync after hydration, before localized
          content is parsed by assistive tools.
          共享根布局在语言切换时保持挂载；客户端副作用在辅助工具解析本地化
          内容前修正文档语言。 */}
      <DocumentLanguageSetter value={documentLanguage} />
      <RootProvider
        search={{
          SearchDialog: DefaultSearchDialog,
          options: {
            defaultTag: '',
            tags: searchTags,
          },
        }}
        theme={{ enabled: false }}
        i18n={i18nProvider(i18nUI, locale)}
      >
        {/* The centralized provider owns route policy, DOM clones, cleanup, and reduced motion.
            集中式 Provider 统一管理路由策略、DOM 克隆、清理与减弱动画。 */}
        <TransitionProvider>
          {/* Records the source page before entering the guestbook so its back
              link can restore the exact origin document.
              进入留言板前记录来源页面，使返回链接可还原精确的原始文档。 */}
          <GuestbookReturnTracker />
          <Suspense fallback={null}>
            <SearchSpotlight />
          </Suspense>
          {children}
        </TransitionProvider>
      </RootProvider>
    </>
  );
}
