// Fumadocs source loader. Reuses the shared i18n config from `@/lib/i18n`
// so the loader and `defineI18nUI` stay in lockstep (single source of truth).
// Fumadocs source loader：复用 @/lib/i18n 的共享 i18n 配置，
// 让 loader 与 defineI18nUI 共用同一份配置（避免漂移）。

import { loader } from 'fumadocs-core/source';
import { docs } from '@/.source/server';
import { i18n } from '@/lib/i18n';

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  i18n,
});
