// Root redirect: static export does not support Next.js middleware,
// so we use a native replace that does not depend on App Router initialization.
// 根路径重定向：静态导出不支持 Next.js middleware，
// 使用原生 replace，避免依赖 App Router 初始化状态。

'use client';

import { useEffect } from 'react';
import { getPageDictionary } from '@/dictionaries';
import { i18n } from '@/lib/i18n';

export default function RootRedirect() {
  const defaultLocaleHref = `/${i18n.defaultLanguage}`;
  // Loading copy uses the default language since the redirect always targets it.
  // 加载文案使用默认语言，因为重定向目标始终是默认语言。
  const { loading } = getPageDictionary(i18n.defaultLanguage);

  useEffect(() => {
    window.location.replace(defaultLocaleHref);
  }, [defaultLocaleHref]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-muted-foreground">{loading}</div>
    </div>
  );
}
