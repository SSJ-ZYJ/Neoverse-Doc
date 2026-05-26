// Static search API with Mandarin tokenizer for Chinese support.
// Uses @orama/tokenizers/mandarin for proper CJK segmentation.
// 静态搜索 API，使用 Mandarin 分词器支持中文搜索。
// 通过 @orama/tokenizers/mandarin 实现正确的 CJK 分词。

import { createFromSource } from 'fumadocs-core/search/server';
import { createTokenizer } from '@orama/tokenizers/mandarin';
import { source } from '@/lib/source';

export const dynamic = 'force-static';

const { staticGET } = createFromSource(source, {
  localeMap: {
    zh: {
      components: {
        tokenizer: createTokenizer(),
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
