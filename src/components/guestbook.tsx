// Giscus-backed guestbook. Locale comes from the active [lang] route segment;
// add a Locale → Giscus lang code mapping when introducing a new language pack.
// 基于 Giscus 的留言墙。语言取自当前 [lang] 路由段；
// 新增语言包时记得同步扩展 Locale → Giscus lang 代码映射。
// Uses `slugKey` as the discussion term so that Chinese and English pages share the same discussion thread.
// 使用 `slugKey` 作为讨论标识，使中英文页面共享同一个讨论串。

'use client';

import Giscus from '@giscus/react';
import { useParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { i18n, type Locale, resolveLocale } from '@/lib/i18n';
import { GISCUS_CONFIG, GISCUS_THEME_PATHS, GISCUS_THEME_URLS } from '@/lib/site-config';

const GISCUS_LANG_MAP: Record<Locale, string> = {
  zh: 'zh-CN',
  en: 'en',
};

interface GuestbookProps {
  slugKey: string;
}

export function Guestbook({ slugKey }: GuestbookProps) {
  const { resolvedTheme } = useTheme();
  const params = useParams<{ lang?: string }>();
  const [siteOrigin, setSiteOrigin] = useState<string>();
  const locale = resolveLocale(params?.lang);
  // Fallback references i18n.defaultLanguage to stay consistent if the default ever changes.
  // 回退引用 i18n.defaultLanguage，确保默认语言变更时保持一致。
  const giscusLang = GISCUS_LANG_MAP[locale] ?? GISCUS_LANG_MAP[i18n.defaultLanguage];
  const themeVariant = resolvedTheme === 'dark' ? 'dark' : 'light';
  const themeUrl =
    process.env.NODE_ENV === 'production'
      ? GISCUS_THEME_URLS[themeVariant]
      : siteOrigin
        ? new URL(GISCUS_THEME_PATHS[themeVariant], siteOrigin).toString()
        : undefined;

  // Giscus requires an absolute custom-theme URL because its content is rendered
  // in a cross-origin iframe; defer mounting until the browser origin is known.
  // Giscus 在跨域 iframe 中渲染，故自定义主题必须使用绝对 URL；
  // 等浏览器来源可用后再挂载，避免服务端与客户端主题不一致。
  useEffect(() => {
    setSiteOrigin(window.location.origin);
  }, []);

  return (
    <div className="giscus-shell" data-loading={themeUrl ? undefined : ''}>
      {themeUrl ? (
        <Giscus
          repo={GISCUS_CONFIG.repo}
          repoId={GISCUS_CONFIG.repoId}
          category={GISCUS_CONFIG.category}
          categoryId={GISCUS_CONFIG.categoryId}
          mapping="specific"
          term={slugKey}
          reactionsEnabled="1"
          emitMetadata="0"
          inputPosition="top"
          theme={themeUrl}
          lang={giscusLang}
          loading="lazy"
        />
      ) : (
        <div className="giscus-shell__placeholder" aria-hidden="true" />
      )}
    </div>
  );
}
