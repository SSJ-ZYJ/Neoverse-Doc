import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';
import { pageSchema } from 'fumadocs-core/source/schema';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import remarkGithubBlockquoteAlert from 'remark-github-blockquote-alert';
import { z } from 'zod';
import { remarkCodeTitle } from './src/lib/remark-code-title';
import { transformerMetaTitle } from './src/lib/transformer-meta-title';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema.extend({
      author: z.union([z.string(), z.array(z.string())]).optional(),
    }),
  },
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkGithubBlockquoteAlert, remarkMdxMermaid, remarkCodeTitle],
    rehypeCodeOptions: {
      transformers: [transformerMetaTitle()],
    } as never,
  },
});
