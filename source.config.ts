import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';
import { pageSchema } from 'fumadocs-core/source/schema';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import remarkGithubBlockquoteAlert from 'remark-github-blockquote-alert';
import { z } from 'zod';
import { remarkCodeTitle } from './src/lib/remark-code-title';
import { remarkCollapsibleAlert } from './src/lib/remark-collapsible-alert';
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
    remarkPlugins: [
      remarkCollapsibleAlert,
      remarkGithubBlockquoteAlert,
      remarkMdxMermaid,
      remarkCodeTitle,
    ],
    rehypeCodeOptions: {
      transformers: [transformerMetaTitle()],
      icon: {
        extend: {
          html: {
            viewBox: '0 0 24 24',
            fill: 'currentColor',
            d: 'M1.5 0h21l-1.91 21.563L11.977 24l-8.565-2.438L1.5 0zm7.031 9.75l-.232-2.718 10.059.003.23-2.622L5.412 4.41l.698 8.01h9.126l-.326 3.426-2.91.804-2.955-.81-.188-2.11H6.248l.33 4.171L12 19.351l5.379-1.443.744-8.157H8.531z',
          },
          css: {
            viewBox: '0 0 24 24',
            fill: 'currentColor',
            d: 'M1.5 0h21l-1.91 21.563L11.977 24l-8.564-2.438L1.5 0zm17.09 4.413L5.41 4.41l.213 2.622 10.125.002-.255 2.716h-6.64l.24 2.573h6.182l-.366 3.523-2.91.804-2.956-.81-.188-2.11h-2.61l.29 3.855L12 19.288l5.373-1.53L18.59 4.414z',
          },
        },
      },
    } as never,
  },
});
