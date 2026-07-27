// Standalone guestbook page (per locale): wraps Giscus comments with localized
// header, back-link, and metadata pulled from the dictionary.
// 独立留言墙页面（按语言）：包装 Giscus 评论，标题、返回链接、元信息均来自字典。

import { MessageSquareText } from 'lucide-react';
import { Guestbook } from '@/components/guestbook';
import { BackLink } from '@/components/transition/back-link';
import { getPageDictionary } from '@/dictionaries';
import { generateLocaleStaticParams, resolveLocale } from '@/lib/i18n';

// Stable Giscus term for the standalone guestbook across all locales.
// 独立留言墙跨语言共用的稳定 Giscus 讨论标识。
const GUESTBOOK_SLUG_KEY = 'guestbook';

export const generateStaticParams = generateLocaleStaticParams;

export default async function GuestbookPage({ params }: PageProps<'/[lang]/guestbook'>) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const dict = getPageDictionary(locale);

  return (
    <main className="special-page guestbook-page">
      <div className="guestbook-page__inner">
        <div className="guestbook-page__header">
          {/* The guestbook has a deterministic home destination so its route
              transition can be prefetched and prepared without history lookup.
              留言板固定返回主页，使路由可预取且无需查询浏览历史即可准备转场。 */}
          <BackLink href={`/${locale}`} label={dict.backToHome} />
          <div className="special-page__icon">
            <MessageSquareText size={24} />
          </div>
          <h1 className="mt-5 mb-2 text-3xl font-bold text-fd-foreground">{dict.guestbookTitle}</h1>
          <p className="m-0 text-base text-fd-muted-foreground">{dict.guestbookDesc}</p>
        </div>
        <div className="guestbook-page__surface">
          <Guestbook slugKey={GUESTBOOK_SLUG_KEY} />
        </div>
      </div>
    </main>
  );
}
