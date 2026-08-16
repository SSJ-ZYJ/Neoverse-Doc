// Secondary homepage Chapter entries are derived from Fumadocs' locale page
// tree, so the portal never links to categories that do not exist in the repo.
// 首页次级 Chapter 入口来自 Fumadocs 对应语言页面树，避免链接到仓库中不存在的栏目。

import type { Folder, Item } from 'fumadocs-core/page-tree';
import { source } from '@/adapters/fumadocs/source';
import type { Locale } from '@/lib/i18n';

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

// Search scope tags reuse the same locale page tree as the homepage and the first
// source slug as the server-side index tag, keeping chapter filters in sync with content.
// 搜索范围标签复用首页的本地化页面树，并以内容源首段 slug 对齐服务端索引标签，
// 确保章节增删或改名后筛选项自动同步。
export function getSearchChapterTags(locale: Locale): { name: string; value: string }[] {
  const pagesByUrl = new Map(source.getPages(locale).map((page) => [page.url, page]));

  return getHomeChapters(locale).flatMap((chapter) => {
    const tag = pagesByUrl.get(chapter.href)?.slugs[0];
    return tag ? [{ name: chapter.title, value: tag }] : [];
  });
}
