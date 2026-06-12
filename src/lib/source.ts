// Fumadocs source loader. Reuses the shared i18n config from `@/lib/i18n`
// so the loader and `defineI18nUI` stay in lockstep (single source of truth).
// The icon handler maps the `icon: Name` string used in frontmatter / meta.json
// to a lucide-react component, following the official Fumadocs convention —
// Fumadocs itself does not ship an icon library.
// Fumadocs source loader：复用 @/lib/i18n 的共享 i18n 配置，
// 让 loader 与 defineI18nUI 共用同一份配置（避免漂移）。
// icon 处理器按 Fumadocs 官方约定把 frontmatter / meta.json 里的 `icon: Name`
// 字符串映射为 lucide-react 组件 —— Fumadocs 本身不内置图标库。

import { loader } from 'fumadocs-core/source';
import { icons } from 'lucide-react';
import { createElement } from 'react';
import { docs } from '@/.source/server';
import { i18n } from '@/lib/i18n';

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  i18n,
  icon(icon) {
    if (!icon) return;
    if (icon in icons) {
      return createElement(icons[icon as keyof typeof icons]);
    }
  },
});
