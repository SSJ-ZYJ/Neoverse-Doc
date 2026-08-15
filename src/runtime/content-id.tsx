/**
 * Client-side stable content identity. The docs page (server) derives the
 * full Content ID (`docs:<id>`) from frontmatter and provides it here, so
 * client consumers persist state by identity instead of URL pathname.
 * Returns undefined outside a provider (e.g. MDX preview), letting callers
 * fall back to their legacy keying.
 *
 * 客户端稳定内容身份。文档页（服务端）从 frontmatter 派生完整 Content ID
 * （`docs:<id>`）并在此提供，客户端消费方按身份而非 URL 路径持久化状态。
 * 在 Provider 之外（如 MDX 预览）返回 undefined，由调用方回退旧 key 方案。
 */
'use client';

import { createContext, type ReactNode, useContext } from 'react';

const ContentIdContext = createContext<string | undefined>(undefined);

export function ContentIdProvider({
  children,
  contentId,
}: {
  children: ReactNode;
  contentId: string;
}) {
  return <ContentIdContext.Provider value={contentId}>{children}</ContentIdContext.Provider>;
}

export function useContentId(): string | undefined {
  return useContext(ContentIdContext);
}
