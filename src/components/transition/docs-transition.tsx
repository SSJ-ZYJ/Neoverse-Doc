// Stable document body wrapper: keeps MDX content server-rendered instead of
// placing it behind a client animation boundary that can stall hydration.
// 稳定的文档正文包装器：保持 MDX 内容由服务端直接渲染，避免客户端动画边界卡住水合。

import type { ReactNode } from 'react';

interface DocsTransitionProps {
  slugKey: string;
  children: ReactNode;
}

export function DocsTransition({ slugKey, children }: DocsTransitionProps) {
  return <div data-doc-slug={slugKey}>{children}</div>;
}
