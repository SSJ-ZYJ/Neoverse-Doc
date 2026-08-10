// Static search API with Chinese/English tokenization and namespaced Pinyin aliases.
// Pinyin aliases are limited to Chinese page titles and headings.
// 静态搜索 API，支持中英文分词与带命名空间的拼音别名。
// 拼音别名仅写入中文页面标题与小节标题。

import { createFromSource } from 'fumadocs-core/search/server';
import { createMixedTokenizer, markPinyinIndexContent } from '@/lib/search-tokenizer';
import { source } from '@/lib/source';

export const dynamic = 'force-static';

const { staticGET } = createFromSource(source, {
  // Index the top-level content slug as a Fumadocs tag so clients can limit
  // results to one chapter without maintaining a separate chapter map.
  // 将内容首级 slug 写入 Fumadocs 标签，使客户端可限定单章搜索，
  // 同时避免额外维护章节映射。
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
      // zbsearch forbids passing `language` alongside a custom tokenizer
      // (NO_LANGUAGE_WITH_CUSTOM_TOKENIZER). fumadocs-core's createDB defaults
      // `language` to "multilingual", which would trigger that error. An empty
      // string is falsy so it bypasses both the destructuring default (only
      // `undefined` triggers it) and zbsearch's check, while keeping the
      // zh-CN dictionary segmenter for proper Chinese word segmentation.
      // zbsearch 禁止同时传入 language 与自定义分词器；fumadocs-core 的 createDB
      // 会将 language 默认为 "multilingual" 从而触发该错误。空字符串为假值，
      // 既不触发解构默认值（仅 undefined 触发），也能绕过 zbsearch 的校验，
      // 同时保留 zh-CN 词典分词器以实现正确的中文分词。
      language: '',
      components: {
        tokenizer: createMixedTokenizer(),
      },
      search: {
        threshold: 0,
        tolerance: 0,
      },
    },
    en: {
      language: 'english',
    },
  },
});

export const GET = staticGET;
