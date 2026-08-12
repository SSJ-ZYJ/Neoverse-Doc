import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';
import type { MDXPresetOptions } from 'fumadocs-mdx/config';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { CODE_ICON_OPTIONS } from './code-icons';
import { remarkCodeTitle } from './remark-code-title';
import { remarkCollapsibleAlert } from './remark-collapsible-alert';
import { remarkGithubAlert } from './remark-github-alert';
import { remarkLangAlias } from './remark-lang-alias';
import { remarkLongCodeBlock } from './remark-long-code-block';
import { transformerMetaTitle } from './transformer-meta-title';

export const docsMdxOptions = {
  // LaTeX math rendering: parse `$...$` / `$$...$$` and emit KaTeX HTML before code highlighting.
  // LaTeX 公式渲染：解析 `$...$` / `$$...$$`，并在代码高亮前输出 KaTeX HTML。
  remarkPlugins: [
    remarkCollapsibleAlert,
    remarkGithubAlert,
    remarkMath,
    remarkMdxMermaid,
    remarkCodeTitle,
    remarkLangAlias,
    remarkLongCodeBlock,
  ],
  rehypePlugins: (plugins) => [rehypeKatex, ...plugins],
  rehypeCodeOptions: {
    transformers: [transformerMetaTitle()],
    icon: CODE_ICON_OPTIONS,
  } as never,
} satisfies MDXPresetOptions;
