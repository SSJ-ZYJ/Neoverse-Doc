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

// Locale validation — single source of truth for the "is this a supported locale" check.
// 语言校验：唯一来源，避免各处重复实现 includes 判断。
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (i18n.languages as readonly string[]).includes(value);
}

// Resolve a possibly-unknown `lang` param to a valid Locale, falling back to the default.
// 将可能未知的 `lang` 参数解析为合法 Locale，未知时回退到默认语言。
export function resolveLocale(lang: unknown): Locale {
  return isLocale(lang) ? lang : i18n.defaultLanguage;
}

// Shared generateStaticParams for every [lang] route — eliminates 5 duplicate copies.
// 所有 [lang] 路由共用的 generateStaticParams，消除 5 处重复实现。
export function generateLocaleStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}
