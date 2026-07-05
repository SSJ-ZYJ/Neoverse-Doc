// Root redirect: static export does not support middleware, so use native replace.
// 根路径重定向：静态导出不支持 middleware，因此使用原生 replace。
'use client';

import { useEffect } from 'react';
import { LocalizedLoading } from '@/components/localized-loading';
import { i18n } from '@/lib/i18n';

export default function RootRedirect() {
  const defaultLocaleHref = `/${i18n.defaultLanguage}`;

  useEffect(() => {
    window.location.replace(defaultLocaleHref);
  }, [defaultLocaleHref]);

  return <LocalizedLoading />;
}
