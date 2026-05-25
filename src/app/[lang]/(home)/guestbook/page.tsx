// Standalone guestbook page (per locale): wraps Giscus comments with localized
// header, back-link, and metadata pulled from the dictionary.
// 独立留言墙页面（按语言）：包装 Giscus 评论，标题、返回链接、元信息均来自字典。

import { MessageSquareText } from 'lucide-react';
import { BackLink } from '@/components/back-link';
import { Guestbook } from '@/components/guestbook';
import { getPageDictionary } from '@/dictionaries';
import { i18n, type Locale } from '@/lib/i18n';

export function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}

export default async function GuestbookPage({ params }: PageProps<'/[lang]/guestbook'>) {
  const { lang } = await params;
  const locale = (lang as Locale) ?? i18n.defaultLanguage;
  const dict = getPageDictionary(locale);

  return (
    <main className="container mx-auto max-w-3xl py-24 px-4 min-h-screen">
      <div className="mb-10 flex flex-col items-center text-center">
        <BackLink fallbackHref={`/${locale}/docs/about`} label={dict.backToDocs} />
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl glass-chip text-fd-accent-foreground">
          <MessageSquareText size={24} />
        </div>
        <h1 className="text-3xl font-bold text-fd-foreground mb-2">{dict.guestbookTitle}</h1>
        <p className="text-fd-muted-foreground text-base">{dict.guestbookDesc}</p>
      </div>
      <Guestbook />
    </main>
  );
}
