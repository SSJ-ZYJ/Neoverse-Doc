// Root redirect: static export does not support middleware, so the client
// redirects to the default locale while handing off the loading scene.
// 根路径重定向：静态导出不支持 middleware，因此客户端跳转到默认语言并交接加载画面。
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { LocalizedLoading } from '@/components/localized-loading';
import { i18n } from '@/lib/i18n';
import { mountRouteLoadingHandoff } from '@/lib/route-loading-handoff';

export default function RootRedirect() {
  const router = useRouter();
  const hasRedirectedRef = useRef(false);
  const defaultLocaleHref = `/${i18n.defaultLanguage}`;

  useEffect(() => {
    if (hasRedirectedRef.current) return;

    hasRedirectedRef.current = true;
    mountRouteLoadingHandoff();
    router.replace(defaultLocaleHref);
  }, [defaultLocaleHref, router]);

  return <LocalizedLoading />;
}
