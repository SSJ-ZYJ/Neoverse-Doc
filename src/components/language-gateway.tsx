'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { LocalizedLoading } from '@/components/localized-loading';
import { getPageDictionary } from '@/dictionaries';
import { getPreferredLocale } from '@/lib/preferred-locale';
import { mountRouteLoadingHandoff } from '@/lib/route-loading-handoff';

const zh = getPageDictionary('zh');
const en = getPageDictionary('en');

export function LanguageGateway() {
  const router = useRouter();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (hasRedirectedRef.current) return;

    hasRedirectedRef.current = true;
    const languages = navigator.languages.length > 0 ? navigator.languages : [navigator.language];
    const locale = getPreferredLocale(languages);
    mountRouteLoadingHandoff();
    router.replace(`/${locale}`);
  }, [router]);

  return (
    <>
      <LocalizedLoading />

      {/* Crawlable links let non-script clients discover both stable locale URLs.
          可抓取链接让无脚本客户端也能发现两个稳定语言 URL。 */}
      <nav
        className="sr-only"
        aria-label={`${zh.languageGatewayTitle} / ${en.languageGatewayTitle}`}
      >
        <Link href="/zh" hrefLang="zh-CN">
          {zh.languageGatewayAction}
        </Link>
        <Link href="/en" hrefLang="en">
          {en.languageGatewayAction}
        </Link>
      </nav>

      <noscript>
        <style>{'.route-loading-shell{display:none}'}</style>
        <main className="special-page">
          <section className="special-page__surface" lang="zh-CN">
            <h1>{zh.languageGatewayTitle}</h1>
            <p>{zh.languageGatewayDescription}</p>
            <p>
              <a href="/zh" hrefLang="zh-CN">
                {zh.languageGatewayAction}
              </a>
            </p>
          </section>
          <section className="special-page__surface" lang="en">
            <h2>{en.languageGatewayTitle}</h2>
            <p>{en.languageGatewayDescription}</p>
            <p>
              <a href="/en" hrefLang="en">
                {en.languageGatewayAction}
              </a>
            </p>
          </section>
        </main>
      </noscript>
    </>
  );
}
