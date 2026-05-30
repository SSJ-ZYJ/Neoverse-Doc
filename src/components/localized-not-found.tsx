// Locale-aware not-found fallback with back and home actions.
// 支持语言感知的未找到页面回退组件，提供返回上一页与返回首页入口。

'use client';

import { ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { getPageDictionary } from '@/dictionaries';
import { i18n, type Locale } from '@/lib/i18n';

interface LocalizedNotFoundProps {
  variant?: 'default' | 'docs';
}

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && i18n.languages.includes(value as Locale);
}

function resolveLocale(paramsLang: unknown, pathname: string | null): Locale {
  if (isLocale(paramsLang)) return paramsLang;

  const pathLocale = pathname?.split('/').find(Boolean);
  if (isLocale(pathLocale)) return pathLocale;

  return i18n.defaultLanguage;
}

export function LocalizedNotFound({ variant = 'default' }: LocalizedNotFoundProps) {
  const params = useParams<{ lang?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const locale = resolveLocale(params?.lang, pathname);
  const dict = getPageDictionary(locale);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(`/${locale}`);
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
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
        >
          <Home size={16} />
          {dict.notFoundHome}
        </Link>
      </div>
    </main>
  );
}
