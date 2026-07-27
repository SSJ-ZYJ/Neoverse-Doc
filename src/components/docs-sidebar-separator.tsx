'use client';

// Sidebar separators keep Fumadocs' native spacing while exposing a stable
// styling hook for section-title contrast in desktop and mobile navigation.
// 侧栏分隔标题保留 Fumadocs 原生间距，并为桌面端与移动端的标题对比度提供稳定样式标记。
import type * as PageTree from 'fumadocs-core/page-tree';
import { SidebarSeparator, useFolderDepth } from 'fumadocs-ui/components/sidebar/base';

export function DocsSidebarSeparator({ item }: { item: PageTree.Separator }) {
  const depth = useFolderDepth();

  // Match the installed Fumadocs sidebar's depth-aware item alignment.
  // 与当前 Fumadocs 侧栏按层级缩进的条目对齐。
  return (
    <SidebarSeparator
      data-sidebar-separator=""
      className={`inline-flex items-center gap-2 mb-1 px-2 mt-6 empty:mb-0 [&_svg]:size-4 [&_svg]:shrink-0 ${depth === 0 ? 'first:mt-0' : ''}`}
      style={{ paddingInlineStart: `calc(${2 + 3 * depth} * var(--spacing))` }}
    >
      {item.icon}
      {item.name}
    </SidebarSeparator>
  );
}
