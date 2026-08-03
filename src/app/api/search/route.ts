// Static search API with custom mixed tokenizer for Chinese/English support.
// Uses @orama/tokenizers/mandarin for CJK segmentation + lowercase normalization for English.
// 静态搜索 API，使用自定义混合分词器支持中英文搜索。
// 使用 @orama/tokenizers/mandarin 进行 CJK 分词，并为英文添加小写规范化。

import { createFromSource } from 'fumadocs-core/search/server';
import { createMixedTokenizer } from '@/lib/search-tokenizer';
import { source } from '@/lib/source';

export const dynamic = 'force-static';

const { staticGET } = createFromSource(source, {
  // Index the top-level content slug as a Fumadocs tag so clients can limit
  // results to one chapter without maintaining a separate chapter map.
  // 将内容首级 slug 写入 Fumadocs 标签，使客户端可限定单章搜索，
  // 同时避免额外维护章节映射。
  buildIndex(page) {
    return {
      id: page.url,
      title: page.data.title,
      description: page.data.description,
      url: page.url,
      structuredData: page.data.structuredData,
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
