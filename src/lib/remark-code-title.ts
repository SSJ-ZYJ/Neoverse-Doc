import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

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

const FILE_PATH_PATTERNS = [
  /^[^\S\n]*\/\/[^\S\n]*(.+?)(?:\r?\n|$)/m,
  /^[^\S\n]*\/\*[^\S\n]*(.+?)\s*\*\//m,
  /^[^\S\n]*#[^\S\n]*(.+?)(?:\r?\n|$)/m,
  /^[^\S\n]*<!--[^\S\n]*(.+?)\s*-->/m,
];

const PATH_HINT_RE = /[/\\]/;

function isFilePath(text: string) {
  return PATH_HINT_RE.test(text) || /\.\w{1,6}$/.test(text);
}

export const remarkCodeTitle: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'code', (node) => {
      if (!node.value || !node.lang) return;

      for (const pattern of FILE_PATH_PATTERNS) {
        const match = node.value.match(pattern);
        if (!match?.[1]) continue;

        const candidate = match[1].trim();
        if (!isFilePath(candidate)) continue;

        const existingMeta = node.meta || '';
        if (/\btitle=/.test(existingMeta)) break;

        node.meta = existingMeta ? `${existingMeta} title="${candidate}"` : `title="${candidate}"`;

        node.value = node.value.replace(pattern, '').trimStart();
        break;
      }
    });
  };
};
