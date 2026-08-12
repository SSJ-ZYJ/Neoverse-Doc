import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { extractLeadingCodeTitle } from './code-title';

/**
 * Remark plugin: extracts file path from top comment in code blocks
 * and injects it as `title="..."` into the code fence meta string.
 *
 * Recognized comment formats:
 * // path/to/file.tsx
 * /* path/to/file.tsx *\/
 * # path/to/file.ts
 * <!-- path/to/file.html -->
 *
 * Remark 插件：从代码块顶部注释中提取文件路径，
 * 将其以 `title="..."` 格式注入代码围栏的 meta 字符串。
 */

export const remarkCodeTitle: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'code', (node) => {
      if (!node.value || !node.lang) return;

      const title = extractLeadingCodeTitle(node.value);
      if (!title) return;

      const existingMeta = node.meta || '';
      if (/\btitle=/.test(existingMeta)) return;

      node.meta = existingMeta
        ? `${existingMeta} title="${title.title}"`
        : `title="${title.title}"`;
      node.value = title.body;
    });
  };
};
