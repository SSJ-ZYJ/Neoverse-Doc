// Locale-aware homepage loading band inspired by async-area's compact marquee.
// 语言感知的首页加载横幅，借鉴 async-area 的紧凑跑马灯。
'use client';

import { useParams, usePathname } from 'next/navigation';
import { getPageDictionary } from '@/dictionaries';
import { resolveLocaleFromRouteContext } from '@/lib/route-locale';

const REPEAT_COUNT = 10;

export function LocalizedLoading() {
  const params = useParams<{ lang?: string }>();
  const pathname = usePathname();
  const locale = resolveLocaleFromRouteContext(params?.lang, pathname);
  const dict = getPageDictionary(locale);
  const labels = Array.from({ length: REPEAT_COUNT }, (_, index) => index);

  return (
    <main className="route-loading-shell" aria-busy="true" aria-live="polite">
      <section className="route-loading-band" aria-label={dict.loading}>
        <div className="route-loading-band__shade" aria-hidden="true" />
        <div className="route-loading-band__marquee" aria-hidden="true">
          <div className="route-loading-band__track">
            {labels.map((item) => (
              <span className="route-loading-band__text" key={`loading-a-${item}`}>
                {dict.loadingMarquee}
              </span>
            ))}
            {labels.map((item) => (
              <span className="route-loading-band__text" key={`loading-b-${item}`}>
                {dict.loadingMarquee}
              </span>
            ))}
          </div>
        </div>
      </section>
      <p className="route-loading-sr-only">{dict.loadingMarquee}</p>
    </main>
  );
}
