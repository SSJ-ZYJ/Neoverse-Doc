// Pure route classification and transition selection.
// 纯函数实现的路由分类与转场选择策略。

import type { TransitionKind } from './transition-types';

type RouteRegion = 'home' | 'docs' | 'guestbook' | 'other';

function normalizePath(pathname: string): string {
  const normalized = pathname.split(/[?#]/, 1)[0]?.replace(/\/+$/, '') ?? '';
  return normalized || '/';
}

function splitLocale(pathname: string): { locale: string | null; rest: string } {
  const segments = normalizePath(pathname).split('/').filter(Boolean);
  const [locale, ...rest] = segments;
  return { locale: locale ?? null, rest: `/${rest.join('/')}` };
}

function classifyRoute(pathname: string): RouteRegion {
  const { rest } = splitLocale(pathname);
  if (rest === '/') return 'home';
  if (rest === '/guestbook' || rest.startsWith('/guestbook/')) return 'guestbook';
  if (rest === '/docs' || rest.startsWith('/docs/')) return 'docs';
  return 'other';
}

export function selectTransition(
  sourcePath: string,
  targetPath: string,
): Exclude<TransitionKind, 'auto'> {
  const source = normalizePath(sourcePath);
  const target = normalizePath(targetPath);
  if (source === target) return 'none';

  const sourceLocale = splitLocale(source);
  const targetLocale = splitLocale(target);
  if (sourceLocale.locale !== targetLocale.locale && sourceLocale.rest === targetLocale.rest) {
    return 'crossfade';
  }

  const from = classifyRoute(source);
  const to = classifyRoute(target);
  if ((from === 'home' || from === 'guestbook') && to === 'docs') return 'aperture';
  if (from === 'docs' && (to === 'home' || to === 'guestbook')) return 'overview';
  if ((from === 'home' && to === 'guestbook') || (from === 'guestbook' && to === 'home')) {
    return 'surface';
  }
  if (from === 'docs' && to === 'docs') return 'content';
  return 'surface';
}

export function isSamePageHashNavigation(sourceHref: string, targetHref: string): boolean {
  const source = new URL(sourceHref, 'https://neoverse.local');
  const target = new URL(targetHref, source);
  return (
    source.pathname === target.pathname && source.search === target.search && Boolean(target.hash)
  );
}
