// Locale-aware not-found fallback with back and home actions.
// 支持语言感知的未找到页面回退组件，提供返回上一页与返回首页入口。

'use client';

import { ArrowLeft, BookOpen, Home } from 'lucide-react';
import { useParams, usePathname } from 'next/navigation';
import { StatusCodeDisplay } from '@/components/status-code-display';
import { getPageDictionary } from '@/dictionaries';
import { TransitionLink } from '@/features/transition';
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
  const docsHref = `/${locale}/docs/ch0`;

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
      className={`special-fallback${variant === 'docs' ? ' special-fallback--docs pointer-events-auto relative z-10 [grid-area:main]' : ''}`}
    >
      <div className="special-fallback__panel">
        <StatusCodeDisplay code={dict.notFoundCode} />
        {/* Group the recovery copy into one editorial block beneath the status mark.
            将恢复提示文案组合为状态标识下方的单一内容层级。 */}
        <div className="special-fallback__copy">
          <h1 className="special-fallback__title">{dict.notFoundTitle}</h1>
          <p className="special-fallback__description">{dict.notFoundDesc}</p>
        </div>
        <div className="special-fallback__actions">
          <button
            type="button"
            onClick={handleBack}
            className="control-surface cursor-pointer"
            data-nd-interaction="control"
          >
            <ArrowLeft size={16} />
            {dict.notFoundBack}
          </button>
          <TransitionLink href={homeHref} className="control-surface" data-nd-interaction="control">
            <Home size={16} />
            {dict.notFoundHome}
          </TransitionLink>
          <TransitionLink
            href={docsHref}
            className="control-surface control-surface--primary"
            data-nd-interaction="control"
          >
            <BookOpen size={16} />
            {dict.notFoundDocs}
          </TransitionLink>
        </div>
      </div>
    </main>
  );
}
