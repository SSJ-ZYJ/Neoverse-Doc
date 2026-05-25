// The docs area does NOT wrap an extra motion.div here.
// Reason: fumadocs DocsLayout uses CSS Grid; DocsPage renders three sibling
// nodes ([grid-area:toc-popover], [grid-area:main], [grid-area:toc]) that
// must be direct children of #nd-docs-layout for grid-area to take effect.
// Wrapping them in motion.div breaks the grid relationship, causing TOC to
// collapse below the main content. If page transition animation is needed,
// add a client-side animation wrapper around DocsBody inside page.tsx
// instead of wrapping the entire page at the template level.
// 文档区域不再额外包裹 motion.div。
// 原因：fumadocs DocsLayout 是 CSS Grid，DocsPage 渲染出的
//   - [grid-area:toc-popover]
//   - [grid-area:main]
//   - [grid-area:toc]
// 三个兄弟节点必须是 #nd-docs-layout 的直接子元素，grid-area 才生效。
// 一旦在它们外面再包一层 motion.div，grid 关系断裂，TOC 会塌陷到正文下方。
// 如需文档页过渡动效，请改为在 page.tsx 内部 DocsBody 周围添加客户端动画组件，
// 不要在 template 层包整页。

import type { ReactNode } from 'react';

export default function Template({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
