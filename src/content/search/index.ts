// Search index construction belongs to the content layer; the route only exports it.
// 搜索索引构建属于内容层，路由仅负责导出。
import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/adapters/fumadocs/source';
import { createMixedTokenizer, markPinyinIndexContent } from './tokenizer';

export const { staticGET: staticSearchGET } = createFromSource(source, {
  buildIndex(page) {
    const pinyinEnabled = page.locale === 'zh';
    const structuredData = pinyinEnabled
      ? {
          ...page.data.structuredData,
          headings: page.data.structuredData.headings.map((heading) => ({
            ...heading,
            content: markPinyinIndexContent(heading.content),
          })),
        }
      : page.data.structuredData;

    return {
      id: page.url,
      title: pinyinEnabled ? markPinyinIndexContent(page.data.title) : page.data.title,
      description: page.data.description,
      url: page.url,
      structuredData,
      tag: page.slugs[0],
    };
  },
  localeMap: {
    zh: {
      language: '',
      components: { tokenizer: createMixedTokenizer() },
      search: { threshold: 0, tolerance: 0 },
    },
    en: { language: 'english' },
  },
});
