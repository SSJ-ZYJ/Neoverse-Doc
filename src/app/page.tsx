// Root redirect: static export does not support Next.js middleware,
// so we use useRouter for reliable client-side redirect.
// 根路径重定向：静态导出不支持 Next.js middleware，
// 使用 useRouter 实现可靠的客户端重定向。

'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getPageDictionary } from '@/dictionaries';
import { i18n } from '@/lib/i18n';

export default function RootRedirect() {
  const router = useRouter();
  // Loading copy uses the default language since the redirect always targets it.
  // 加载文案使用默认语言，因为重定向目标始终是默认语言。
  const { loading } = getPageDictionary(i18n.defaultLanguage);

  useEffect(() => {
    router.replace(`/${i18n.defaultLanguage}`);
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-muted-foreground">{loading}</div>
    </div>
  );
}
