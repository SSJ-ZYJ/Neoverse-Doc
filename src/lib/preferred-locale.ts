import type { Locale } from '@/lib/i18n';

const CHINESE_LANGUAGE_PREFIX = 'zh';
const ENGLISH_LANGUAGE_PREFIX = 'en';

function matchesLanguage(language: string, prefix: string): boolean {
  const normalized = language.trim().toLowerCase();
  return normalized === prefix || normalized.startsWith(`${prefix}-`);
}

/**
 * Resolve the root language gateway without changing explicit locale routes.
 * Unknown language environments use English as the agreed neutral fallback.
 *
 * 仅为根语言分流入口解析语言，不改写显式 locale 路由。
 * 未知语言环境按约定回退到英文。
 */
export function getPreferredLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    if (matchesLanguage(language, CHINESE_LANGUAGE_PREFIX)) return 'zh';
    if (matchesLanguage(language, ENGLISH_LANGUAGE_PREFIX)) return 'en';
  }

  return 'en';
}
