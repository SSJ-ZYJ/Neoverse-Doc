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
  unstable_retry: retry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  unstable_retry?: () => void;
}) {
  const params = useParams<{ lang?: Locale }>();
  const locale = (params?.lang as Locale) ?? i18n.defaultLanguage;
  const dict = getPageDictionary(locale);

  // Prefer Next.js App Router retry so failed route segments are refreshed before the boundary resets.
  // 优先使用 Next.js App Router 重试逻辑，确保失败的路由段先刷新再重置错误边界。
  const handleRetry = () => {
    if (retry) {
      retry();
      return;
    }

    reset();
  };

  return (
    <div className="pointer-events-auto relative z-10 [grid-area:main] flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl glass-chip text-fd-muted-foreground">
        <RotateCw size={24} />
      </div>
      <h2 className="text-xl font-semibold text-fd-foreground">{dict.errorTitle}</h2>
      <p className="max-w-md text-sm text-fd-muted-foreground">{dict.errorDesc}</p>
      <button
        type="button"
        onClick={handleRetry}
        className="pointer-events-auto mt-2 cursor-pointer rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
      >
        {dict.errorRetry}
      </button>
    </div>
  );
}
