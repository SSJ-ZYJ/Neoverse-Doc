// Static search API with custom mixed tokenizer for Chinese/English support.
// Uses @orama/tokenizers/mandarin for CJK segmentation + lowercase normalization for English.
// 静态搜索 API，使用自定义混合分词器支持中英文搜索。
// 使用 @orama/tokenizers/mandarin 进行 CJK 分词，并为英文添加小写规范化。

import { createFromSource } from 'fumadocs-core/search/server';
import { createMixedTokenizer } from '@/lib/search-tokenizer';
import { source } from '@/lib/source';

export const dynamic = 'force-static';

const { staticGET } = createFromSource(source, {
  localeMap: {
    zh: {
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
