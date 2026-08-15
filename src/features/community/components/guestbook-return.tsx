// Source-aware guestbook return link. A global click capture records which
// page opened the guestbook; the back action then offers "back to docs" when
// the source was a document page, and otherwise keeps the deterministic home
// destination so the route transition stays prefetchable without history lookup.
// 来源感知的留言板返回链接：全局点击捕获记录打开留言板的来源页面；
// 来源为文档页时返回按钮显示"返回文档"，其余情况保持既定的"返回首页"，
// 使路由转场无需查询浏览历史即可预取与准备。

'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { BackLink } from '@/features/transition';
import { isPlainInternalNavigation } from '@/runtime/navigation/event';

const GUESTBOOK_RETURN_KEY = 'neoverse-docs:guestbook-return';

function normalizePathname(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '');
  return normalized || '/';
}

function isDocsPath(pathname: string): boolean {
  return pathname.split('/').includes('docs');
}

function isGuestbookPath(pathname: string): boolean {
  return pathname.split('/').includes('guestbook');
}

// Records the source path right when a guestbook navigation link is activated,
// so the standalone guestbook page can restore the exact origin document.
// 在留言板导航链接被点击的瞬间记录来源路径，
// 使独立留言板页面能够还原精确的原始文档。
export function GuestbookReturnTracker() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || !isPlainInternalNavigation(event, anchor)) return;

      const destination = new URL(anchor.href, window.location.href);
      if (!isGuestbookPath(destination.pathname)) return;

      const source = normalizePathname(window.location.pathname);
      try {
        window.sessionStorage.setItem(GUESTBOOK_RETURN_KEY, source);
      } catch {
        // Storage can be unavailable in privacy-restricted browsing contexts.
        // 隐私受限的浏览环境可能无法使用存储，此时保持默认返回行为。
      }
    };

    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, []);

  return null;
}

interface GuestbookReturnLinkProps {
  docsLabel: string;
  homeHref: string;
  homeLabel: string;
}

// Back link that restores the recorded source docs page when present and
// otherwise falls back to the deterministic home destination.
// 返回链接：存在记录的来源文档页时恢复之，否则回退到既定的首页目标。
export function GuestbookReturnLink({ docsLabel, homeHref, homeLabel }: GuestbookReturnLinkProps) {
  const [returnHref, setReturnHref] = useState<string | null>(null);

  useLayoutEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(GUESTBOOK_RETURN_KEY);
      if (stored && isDocsPath(stored)) setReturnHref(stored);
    } catch {
      // Storage can be unavailable in privacy-restricted browsing contexts.
      // 隐私受限的浏览环境可能无法使用存储，此时保持默认返回行为。
    }
  }, []);

  return returnHref ? (
    <BackLink href={returnHref} label={docsLabel} />
  ) : (
    <BackLink href={homeHref} label={homeLabel} />
  );
}
