// Shared i18n config (single source of truth) — consumed by:
//   1. source loader (`src/lib/source.ts`) to bucket docs per language
//   2. fumadocs-ui translations (`src/lib/layout.shared.tsx`) via defineI18nUI
// Static export: no middleware (we redirect from `/` to defaultLanguage on client).
// 集中式 i18n 配置（唯一来源），被以下两处消费：
//   1. source loader 用以按语言分桶文档
//   2. fumadocs-ui 翻译（defineI18nUI）
// 静态导出场景：未启用 middleware，根路径在客户端跳转到默认语言。

import { defineI18n } from 'fumadocs-core/i18n';

export const i18n = defineI18n({
  defaultLanguage: 'zh',
  languages: ['zh', 'en'],
  parser: 'dir',
});

export type Locale = (typeof i18n.languages)[number];
