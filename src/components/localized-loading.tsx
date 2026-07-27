// Locale-aware loading route mirrors the homepage knowledge-network visual language.
// 语言感知的加载路由复用首页知识网络的视觉语言。
'use client';

import { useParams, usePathname } from 'next/navigation';
import { SplitText } from '@/components/react-bits/split-text';
import { getPageDictionary } from '@/dictionaries';
import { resolveLocaleFromRouteContext } from '@/lib/route-locale';

// Two identical groups make the viewport-wide loading marquee loop seamlessly.
// 两组完全一致的内容让全宽加载跑马灯可以无缝循环。
const MARQUEE_REPEAT_COUNT = 4;

export function LocalizedLoading() {
  const params = useParams<{ lang?: string }>();
  const pathname = usePathname();
  const locale = resolveLocaleFromRouteContext(params?.lang, pathname);
  const dict = getPageDictionary(locale);
  const marqueeItems = Array.from({ length: MARQUEE_REPEAT_COUNT }, (_, index) => index);

  return (
    <main className="route-loading-shell" aria-busy="true" aria-live="polite">
      {/* Ambient layers echo the homepage network without adding interactive noise.
          环境层呼应首页知识网络，同时避免引入交互干扰。 */}
      <div className="route-loading-ambient" aria-hidden="true">
        <span className="route-loading-ambient__orb route-loading-ambient__orb--ice" />
        <span className="route-loading-ambient__orb route-loading-ambient__orb--mint" />
        <span className="route-loading-ambient__grid" />
      </div>

      {/* The viewport-wide stage revives the previous marquee silhouette while
          retaining the current network, glass, and semantic color system.
          横贯视口的舞台重现上一版跑马灯轮廓，同时保留当前网络、玻璃与语义色体系。 */}
      <section className="route-loading-stage">
        <div className="route-loading-stage__brand">
          {/* Paired status signals keep the loading masthead optically balanced.
              成对状态信号让加载页顶部品牌条保持视觉对称。 */}
          <span className="route-loading-stage__signal" aria-hidden="true" />
          <span>{dict.siteTitle}</span>
          <span className="route-loading-stage__signal" aria-hidden="true" />
        </div>

        {/* The duplicated text groups reproduce the old seamless marquee as one
            uninterrupted data stream across the viewport.
            双组文字以横贯视口的连续数据流重现旧版无缝跑马灯。 */}
        <div className="route-loading-band" aria-hidden="true">
          <div className="route-loading-band__shade" />
          <div className="route-loading-band__marquee">
            <div className="route-loading-band__track">
              {[0, 1].map((group) => (
                <div className="route-loading-band__group" key={`loading-group-${group}`}>
                  {marqueeItems.map((item) => (
                    <SplitText
                      className="route-loading-band__text"
                      key={`loading-${group}-${item}`}
                      text={dict.loadingMarquee}
                      variant="pulse"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <span className="route-loading-status" role="status">
          {dict.loading}
        </span>

        <div className="route-loading-progress" aria-hidden="true">
          <span className="route-loading-progress__track">
            <span className="route-loading-progress__indicator" />
          </span>
          <div className="route-loading-progress__nodes">
            {marqueeItems.slice(0, 3).map((item) => (
              <span key={`loading-node-${item}`} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
