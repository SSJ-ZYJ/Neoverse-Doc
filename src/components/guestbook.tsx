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
import { i18n, type Locale } from '@/lib/i18n';

const GISCUS_LANG_MAP: Record<Locale, string> = {
  zh: 'zh-CN',
  en: 'en',
};

interface GuestbookProps {
  slugKey: string;
}

export function Guestbook({ slugKey }: GuestbookProps) {
  const { resolvedTheme } = useTheme();
  const params = useParams<{ lang?: Locale }>();
  const locale = (params?.lang as Locale) ?? i18n.defaultLanguage;
  const giscusLang = GISCUS_LANG_MAP[locale] ?? GISCUS_LANG_MAP[i18n.defaultLanguage];

  return (
    <Giscus
      repo="SSJ-ZYJ/Neoverse-Doc"
      repoId="R_kgDOSl2-Eg"
      category="Announcements"
      categoryId="DIC_kwDOSl2-Es4C9t6O"
      mapping="specific"
      term={slugKey}
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="top"
      theme={resolvedTheme === 'dark' ? 'transparent_dark' : 'light'}
      lang={giscusLang}
      loading="lazy"
    />
  );
}
