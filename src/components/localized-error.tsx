// Locale-aware route error fallback with resilient retry behavior.
// 支持语言感知的路由错误回退组件，并提供带兜底刷新的重试能力。

'use client';

import { Home, RotateCw } from 'lucide-react';
import { useParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import { StatusCodeDisplay } from '@/components/status-code-display';
import { TransitionLink } from '@/components/transition/transition-link';
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
  const homeHref = `/${locale}`;
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
      aria-labelledby="route-error-title"
      aria-describedby="route-error-description"
      className={`special-fallback special-fallback--error${variant === 'docs' ? ' special-fallback--docs pointer-events-auto relative z-10 [grid-area:main]' : ''}`}
    >
      {/* Reuse the status hierarchy from the not-found page so every route
          fallback shares one recognizable recovery pattern.
          复用未找到页面的状态层级，让所有路由回退保持一致、可识别的恢复模式。 */}
      <div className="special-fallback__panel">
        <StatusCodeDisplay code={dict.errorCode} />
        <div className="special-fallback__copy">
          <h1 className="special-fallback__title" id="route-error-title">
            {dict.errorTitle}
          </h1>
          <p className="special-fallback__description" id="route-error-description">
            {dict.errorDesc}
          </p>
        </div>
        <div className="special-fallback__actions">
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            aria-busy={isRetrying}
            className="control-surface control-surface--primary pointer-events-auto cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RotateCw className={isRetrying ? 'animate-spin' : undefined} size={16} />
            {dict.errorRetry}
          </button>
          <TransitionLink href={homeHref} className="control-surface">
            <Home size={16} />
            {dict.backToHome}
          </TransitionLink>
        </div>
      </div>
    </main>
  );
}
