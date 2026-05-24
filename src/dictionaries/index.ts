// Page dictionary index. The single source of truth for the locale list is
// src/lib/i18n.ts (`defineI18n`); this file only exposes a per-locale lookup
// for application page copy.
// 页面字典入口。语言列表的唯一来源是 src/lib/i18n.ts 的 defineI18n，
// 本文件只暴露针对页面文案的按 locale 查询。

import type { Locale } from '@/lib/i18n';
import { i18n } from '@/lib/i18n';
import { en } from './en';
import { zh } from './zh';

const dictionaries = { zh, en } as const;

export function getPageDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries[i18n.defaultLanguage];
}
