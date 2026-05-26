import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import remarkGithubBlockquoteAlert from 'remark-github-blockquote-alert';
import { remarkCodeTitle } from './src/lib/remark-code-title';
import { transformerMetaTitle } from './src/lib/transformer-meta-title';

export const docs = defineDocs({
  dir: 'content/docs',
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkGithubBlockquoteAlert, remarkMdxMermaid, remarkCodeTitle],
    rehypeCodeOptions: {
      transformers: [transformerMetaTitle()],
    } as never,
  },
});
