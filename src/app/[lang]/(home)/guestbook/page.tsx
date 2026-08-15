// Standalone guestbook page (per locale): wraps Giscus comments with localized
// header, back-link, and metadata pulled from the dictionary. The back link is
// source-aware: it restores the originating docs page when entered from docs.
// 独立留言墙页面（按语言）：包装 Giscus 评论，标题、返回链接、元信息均来自字典。
// 返回链接为来源感知：从文档页进入时还原来源文档页。

import { MessageSquareText } from 'lucide-react';
import type { Metadata } from 'next';
import { getPageDictionary } from '@/dictionaries';
import { Guestbook, GuestbookReturnLink } from '@/features/community';
import {
  generateLocaleStaticParams,
  LANGUAGE_TAGS,
  OPEN_GRAPH_LOCALES,
  resolveLocale,
} from '@/lib/i18n';
import { SOCIAL_IMAGE } from '@/lib/site-config';

// Stable Giscus term for the standalone guestbook across all locales.
// 独立留言墙跨语言共用的稳定 Giscus 讨论标识。
const GUESTBOOK_SLUG_KEY = 'guestbook';

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata(props: PageProps<'/[lang]/guestbook'>): Promise<Metadata> {
  const { lang } = await props.params;
  const locale = resolveLocale(lang);
  const dict = getPageDictionary(locale);
  const url = `/${locale}/guestbook`;

  return {
    title: dict.guestbookTitle,
    description: dict.guestbookDesc,
    alternates: { canonical: url },
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    },
    openGraph: {
      type: 'website',
      url,
      title: dict.guestbookTitle,
      description: dict.guestbookDesc,
      siteName: dict.siteTitle,
      locale: OPEN_GRAPH_LOCALES[locale],
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.guestbookTitle,
      description: dict.guestbookDesc,
      images: [SOCIAL_IMAGE],
    },
  };
}

export default async function GuestbookPage({ params }: PageProps<'/[lang]/guestbook'>) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const dict = getPageDictionary(locale);

  return (
    <main className="special-page guestbook-page" lang={LANGUAGE_TAGS[locale]}>
      <div className="guestbook-page__inner">
        <div className="guestbook-page__header">
          {/* The back link restores the recorded source docs page when the
              guestbook was opened from a document; otherwise it falls back to
              the deterministic home destination so the route transition stays
              prefetchable without history lookup.
              返回链接在留言板从文档页打开时还原记录的来源文档页；
              其余情况回退到既定的首页目标，使路由转场无需查询浏览历史即可预取。 */}
          <GuestbookReturnLink
            docsLabel={dict.backToDocs}
            homeHref={`/${locale}`}
            homeLabel={dict.backToHome}
          />
          <div className="special-page__icon">
            <MessageSquareText size={24} />
          </div>
          <h1 className="mt-5 mb-2 text-3xl font-bold text-fd-foreground">{dict.guestbookTitle}</h1>
          <p className="m-0 text-base text-fd-muted-foreground">{dict.guestbookDesc}</p>
        </div>
        <div className="guestbook-page__surface" data-nd-interaction="surface">
          <Guestbook slugKey={GUESTBOOK_SLUG_KEY} />
        </div>
      </div>
    </main>
  );
}
