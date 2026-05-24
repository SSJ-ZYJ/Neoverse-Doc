import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import remarkGithubBlockquoteAlert from 'remark-github-blockquote-alert';

export const docs = defineDocs({
  dir: 'content/docs',
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkGithubBlockquoteAlert, remarkMdxMermaid],
  },
});
