// Route fallback locale resolver shared by client-side error and not-found pages.
// 路由回退页共用的语言解析器，用于客户端 error / not-found 页面。

import { i18n, isLocale, type Locale } from '@/lib/i18n';

// Resolve locale from params first, then from the pathname's first segment,
// falling back to the default language when a boundary renders outside [lang].
// 先从 params 解析 locale，再回退到路径首段；当边界在 [lang] 外渲染时使用默认语言。
export function resolveLocaleFromRouteContext(
  paramsLang: unknown,
  pathname: string | null,
): Locale {
  if (isLocale(paramsLang)) return paramsLang;

  const pathLocale = pathname?.split('/').find(Boolean);
  if (isLocale(pathLocale)) return pathLocale;

  return i18n.defaultLanguage;
}
