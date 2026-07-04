// Locale-aware not-found fallback with back and home actions.
// 支持语言感知的未找到页面回退组件，提供返回上一页与返回首页入口。

'use client';

import { ArrowLeft, Home } from 'lucide-react';
import { useParams, usePathname } from 'next/navigation';
import { getPageDictionary } from '@/dictionaries';
import { resolveLocaleFromRouteContext } from '@/lib/route-locale';

interface LocalizedNotFoundProps {
  variant?: 'default' | 'docs';
}

export function LocalizedNotFound({ variant = 'default' }: LocalizedNotFoundProps) {
  const params = useParams<{ lang?: string }>();
  const pathname = usePathname();
  const locale = resolveLocaleFromRouteContext(params?.lang, pathname);
  const dict = getPageDictionary(locale);
  const homeHref = `/${locale}`;

  const handleBack = () => {
    // Use the browser history API so not-found recovery does not depend on
    // App Router actions that may still be initializing on fallback pages.
    // 使用浏览器历史 API，避免 not-found 回退依赖仍在初始化中的 App Router action。
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.assign(homeHref);
  };

  return (
    <main
      className={
        variant === 'docs'
          ? 'pointer-events-auto relative z-10 [grid-area:main] flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-20 text-center'
          : 'flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-20 text-center'
      }
    >
      <p className="text-6xl font-bold text-fd-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold text-fd-foreground">{dict.notFoundTitle}</h1>
      <p className="max-w-md text-sm text-fd-muted-foreground">{dict.notFoundDesc}</p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-fd-border bg-fd-secondary px-4 py-2 text-sm font-medium text-fd-secondary-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
        >
          <ArrowLeft size={16} />
          {dict.notFoundBack}
        </button>
        <a
          href={homeHref}
          className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
        >
          <Home size={16} />
          {dict.notFoundHome}
        </a>
      </div>
    </main>
  );
}
