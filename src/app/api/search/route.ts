// Static search API with Chinese/English tokenization and namespaced Pinyin aliases.
// Pinyin aliases are limited to Chinese page titles and headings.
// 静态搜索 API，支持中英文分词与带命名空间的拼音别名。
// 拼音别名仅写入中文页面标题与小节标题。

import { staticSearchGET } from '@/content/search';

export const dynamic = 'force-static';

export const GET = staticSearchGET;
