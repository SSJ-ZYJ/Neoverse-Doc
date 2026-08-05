/**
 * Remark plugin: rewrites non-bundled language identifiers to bundled Shiki
 * grammars and preserves the original language via the `originalLang` meta
 * attribute so that transformers can restore it for display purposes.
 *
 * This avoids triggering Shiki's `langAlias` code path, which creates a new
 * highlighter instance and breaks lazy loading of other bundled languages.
 *
 * Remark 插件：将非内置语言标识符改写为 Shiki 内置语法，
 * 并通过 `originalLang` meta 属性保留原始语言，
 * 以便 transformer 恢复用于显示的语言名称。
 *
 * 这样可以避免触发 Shiki 的 `langAlias` 路径——该路径会创建新的 highlighter
 * 实例并破坏其他内置语言的懒加载。
 */
import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

/**
 * Maps non-bundled language identifiers to bundled Shiki grammar names.
 * 将非内置语言标识符映射到 Shiki 内置语法名。
 */
const LANG_ALIASES: Record<string, string> = {
  // `.gitattributes` uses `#` comments and `attr=value` pairs, closest to ini.
  // `.gitattributes` 使用 `#` 注释和 `attr=value` 键值对，最接近 ini 语法。
  gitattributes: 'ini',
};

export const remarkLangAlias: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'code', (node) => {
      if (!node.lang) return;
      const target = LANG_ALIASES[node.lang];
      if (!target) return;

      const originalLang = node.lang;
      node.lang = target;
      const existingMeta = node.meta || '';
      node.meta = existingMeta
        ? `${existingMeta} originalLang=${originalLang}`
        : `originalLang=${originalLang}`;
    });
  };
};
