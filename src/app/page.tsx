// Root redirect: static export does not support Next.js middleware,
// so we redirect the bare `/` to `/{defaultLanguage}` on the client.
// 根路径重定向：静态导出不支持 Next.js middleware，
// 所以这里通过客户端跳转把裸 `/` 引导到 `/{defaultLanguage}`。

import { i18n } from '@/lib/i18n';

export default function RootRedirect() {
  const target = `/${i18n.defaultLanguage}`;

  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${target}`} />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static literal redirect, no user input
        dangerouslySetInnerHTML={{
          __html: `window.location.replace(${JSON.stringify(target)})`,
        }}
      />
    </>
  );
}
