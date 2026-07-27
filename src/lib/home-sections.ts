// Homepage chapter entries are derived from Fumadocs' locale page tree so
// the portal never links to categories that do not exist in the repository.
// 首页章节入口来自 Fumadocs 对应语言页面树，避免链接到仓库中不存在的栏目。

import type { Folder, Item } from 'fumadocs-core/page-tree';
import type { Locale } from '@/lib/i18n';
import { source } from '@/lib/source';

export interface HomeChapter {
  description: string;
  href: string;
  title: string;
}

function nodeText(value: Folder['name'] | Folder['description']): string {
  return typeof value === 'string' ? value : '';
}

function firstPage(folder: Folder): Item | undefined {
  if (folder.index) return folder.index;
  return folder.children.find((node): node is Item => node.type === 'page');
}

export function getHomeChapters(locale: Locale): HomeChapter[] {
  return source
    .getPageTree(locale)
    .children.filter((node): node is Folder => node.type === 'folder' && node.root === true)
    .flatMap((folder) => {
      const page = firstPage(folder);
      const title = nodeText(folder.name);
      if (!page || !title) return [];
      return [{ title, description: nodeText(folder.description), href: page.url }];
    });
}
