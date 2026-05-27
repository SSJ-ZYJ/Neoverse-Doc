// Docs error boundary: catches runtime errors (e.g. Mermaid render failures)
// and shows a retry UI instead of the default "This page couldn't load" screen.
// 文档错误边界：捕获运行时错误（如 Mermaid 渲染失败），
// 显示重试 UI 而非默认的 "This page couldn't load" 页面。

'use client';

import { RotateCw } from 'lucide-react';
import { useParams } from 'next/navigation';
import { getPageDictionary } from '@/dictionaries';
import { i18n, type Locale } from '@/lib/i18n';

export default function DocsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ lang?: Locale }>();
  const locale = (params?.lang as Locale) ?? i18n.defaultLanguage;
  const dict = getPageDictionary(locale);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl glass-chip text-fd-muted-foreground">
        <RotateCw size={24} />
      </div>
      <h2 className="text-xl font-semibold text-fd-foreground">{dict.errorTitle}</h2>
      <p className="max-w-md text-sm text-fd-muted-foreground">{dict.errorDesc}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
      >
        {dict.errorRetry}
      </button>
    </div>
  );
}
