// Locale-aware route error fallback with resilient retry behavior.
// 支持语言感知的路由错误回退组件，并提供带兜底刷新的重试能力。

'use client';

import { RotateCw } from 'lucide-react';
import { useParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import { getPageDictionary } from '@/dictionaries';
import { resolveLocaleFromRouteContext } from '@/lib/route-locale';

interface LocalizedErrorProps {
  variant?: 'default' | 'docs';
  reset: () => void;
  retry?: () => void;
}

export function LocalizedError({ variant = 'default', reset, retry }: LocalizedErrorProps) {
  const params = useParams<{ lang?: string }>();
  const pathname = usePathname();
  const routeErrorPathname = pathname ?? '';
  const locale = resolveLocaleFromRouteContext(params?.lang, pathname);
  const dict = getPageDictionary(locale);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);

    // Retry in this app means an immediate hard refresh: it reliably exits
    // Next.js dev overlay-forced error states and avoids a delayed no-op feel.
    // 本项目中的重试采用立即硬刷新：可稳定退出 Next.js 开发悬浮窗强制 error 态，
    // 避免点击后延迟或看似无响应。
    retry?.();
    reset();
    window.location.reload();
  };

  return (
    <main
      data-route-error-fallback="true"
      data-route-error-pathname={routeErrorPathname}
      className={
        variant === 'docs'
          ? 'pointer-events-auto relative z-10 [grid-area:main] flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-20 text-center'
          : 'flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-20 text-center'
      }
    >
      <div className="flex size-12 items-center justify-center rounded-xl glass-chip text-fd-muted-foreground">
        <RotateCw className={isRetrying ? 'animate-spin' : undefined} size={24} />
      </div>
      <h1 className="text-2xl font-semibold text-fd-foreground">{dict.errorTitle}</h1>
      <p className="max-w-md text-sm text-fd-muted-foreground">{dict.errorDesc}</p>
      <button
        type="button"
        onClick={handleRetry}
        disabled={isRetrying}
        aria-busy={isRetrying}
        className="pointer-events-auto mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground transition-colors hover:bg-fd-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <RotateCw className={isRetrying ? 'animate-spin' : undefined} size={16} />
        {dict.errorRetry}
      </button>
    </main>
  );
}
