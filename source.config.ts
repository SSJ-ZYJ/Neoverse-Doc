import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { docsMdxOptions } from './src/content/plugins/mdx-options';
import { docsPageSchema } from './src/content/schema/docs';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: docsPageSchema,
  },
});

export default defineConfig({
  mdxOptions: docsMdxOptions,
});
