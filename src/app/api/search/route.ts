// Static search API. orama lacks a built-in Chinese stemmer, so localeMap
// falls zh back to english tokenization (exact / prefix matches still work).
// Add @orama/tokenizers/mandarin for stronger Chinese tokenization when needed.
// 静态搜索 API。orama 未内置中文 stemmer，所以 localeMap 让 zh 回退到 english
// 分词（精确 / 前缀匹配仍然有效）。如需更强的中文分词，可引入 @orama/tokenizers/mandarin。

import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/lib/source';

export const dynamic = 'force-static';

const { staticGET } = createFromSource(source, {
  localeMap: {
    zh: 'english',
    en: 'english',
  },
});

export const GET = staticGET;
