// Page dictionary index. The single source of truth for the locale list is
// src/lib/i18n.ts (`defineI18n`); this file only exposes a per-locale lookup
// for application page copy.
// 页面字典入口。语言列表的唯一来源是 src/lib/i18n.ts 的 defineI18n，
// 本文件只暴露针对页面文案的按 locale 查询。

import type { Locale } from '@/lib/i18n';
import { i18n } from '@/lib/i18n';
import { en } from './en';
import { zh } from './zh';

// Compile-time contract every locale dictionary must satisfy.
// Keeping this here (not in zh.ts/en.ts) avoids a circular type-only import.
// 所有语言字典必须满足的编译期契约。
// 放在此处（而非 zh.ts/en.ts）以避免类型循环引用。
export interface Dictionary {
  siteTitle: string;
  tagline: string;
  loading: string;
  enterDocs: string;
  guestbookTitle: string;
  guestbookDesc: string;
  communityTitle: string;
  communityDesc: string;
  primaryAuthorLabel: string;
  documentContributorsTitle: string;
  backToDocs: string;
  errorTitle: string;
  errorDesc: string;
  errorRetry: string;
  notFoundTitle: string;
  notFoundDesc: string;
  notFoundBack: string;
  notFoundHome: string;
  // Mermaid toolbar a11y labels / Mermaid 工具栏无障碍标签
  mermaidZoomOut: string;
  mermaidZoomIn: string;
  mermaidReset: string;
  mermaidMaximize: string;
  mermaidRestore: string;
  mermaidToolbar: string;
}

const dictionaries: Record<Locale, Dictionary> = { zh, en };

export function getPageDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[i18n.defaultLanguage];
}
