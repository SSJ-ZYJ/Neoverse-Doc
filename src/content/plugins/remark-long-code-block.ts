import type { Root } from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

// Token-level highlighting makes exceptionally long snippets expand into
// thousands of React nodes. Keep normal snippets highlighted, but render very
// large blocks as one raw text node so their content and copy behavior remain
// intact without overwhelming the development compiler or response stream.
// Token 级高亮会让超长代码膨胀为数千个 React 节点。普通代码仍保持高亮，
// 仅将超大代码块渲染为单个原始文本节点，在保留内容与复制能力的同时避免
// 压垮开发编译器和响应流。
const LONG_CODE_BLOCK_LINE_THRESHOLD = 400;

export const remarkLongCodeBlock: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (index === undefined || !parent) return;
      if (countLines(node.value) <= LONG_CODE_BLOCK_LINE_THRESHOLD) return;

      const language = getOriginalLanguage(node.lang, node.meta);
      const attributes: MdxJsxAttribute[] = [attribute('code', node.value)];
      const title = getMetaValue(node.meta, 'title');

      if (language) attributes.push(attribute('lang', language));
      if (title) attributes.push(attribute('title', title));

      const replacement: MdxJsxFlowElement = {
        type: 'mdxJsxFlowElement',
        name: 'LongCodeBlock',
        attributes,
        children: [],
      };

      parent.children[index] = replacement;
    });
  };
};

function countLines(value: string) {
  let lines = 1;
  for (const character of value) {
    if (character === '\n') lines++;
  }
  return lines;
}

function attribute(name: string, value: string): MdxJsxAttribute {
  return {
    type: 'mdxJsxAttribute',
    name,
    value,
  };
}

function getOriginalLanguage(language: string | null | undefined, meta: string | null | undefined) {
  return getMetaValue(meta, 'originalLang') ?? language ?? undefined;
}

function getMetaValue(meta: string | null | undefined, name: string) {
  if (!meta) return undefined;

  const pattern = new RegExp(`(?:^|\\s)${name}=(?:"([^"]*)"|'([^']*)'|(\\S+))`);
  const match = meta.match(pattern);
  return match?.[1] ?? match?.[2] ?? match?.[3];
}
