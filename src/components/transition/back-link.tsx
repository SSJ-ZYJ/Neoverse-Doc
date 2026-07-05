// Client-side back link that returns to the previous page when navigation
// history exists, falling back to a provided href otherwise. Mirrors the
// EnterDocsButton mask-reveal protocol: snapshots <main> into sessionStorage
// before navigating so MaskReveal can play the transition.
// The destination (MaskReveal) decides whether to play mask-reveal (cross-
// route-group) or skip it (within-group, e.g. guestbook → home uses page-enter).
// 客户端返回链接：存在浏览历史时回到上一页，否则跳转至 fallback。
// 与 EnterDocsButton 对称的遮罩揭示协议：导航前将 <main> 快照写入 sessionStorage。
// 目标页（MaskReveal）决定是否播放 mask-reveal（跨路由组）或跳过（同组，如
// 留言板 → 首页使用 page-enter）。

'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { MouseEvent } from 'react';
import { captureTransitionSnapshot } from '@/lib/transition-snapshot';

interface BackLinkProps {
  fallbackHref: string;
  label: string;
}

export function BackLink({ fallbackHref, label }: BackLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Always capture a snapshot. MaskReveal at the destination checks
    // isCrossRouteGroupTransition(sourcePath, currentPath) to decide:
    //   - cross-group (guestbook → docs): play mask-reveal
    //   - within-group (guestbook → home): skip mask-reveal, play page-enter
    // 始终捕获快照。目标页的 MaskReveal 通过 isCrossRouteGroupTransition
    // 判断：跨组（留言板 → 文档）播放 mask-reveal；同组（留言板 → 首页）
    // 跳过 mask-reveal，播放 page-enter。
    captureTransitionSnapshot(event);

    // If there's navigation history, intercept the Link click and go back
    // so the browser restores scroll position and previous state.
    // 存在浏览历史时拦截 Link 点击并后退，
    // 让浏览器恢复滚动位置与上一页状态。
    if (typeof window !== 'undefined' && window.history.length > 1) {
      event.preventDefault();
      window.history.back();
    }
  };

  return (
    <Link
      href={fallbackHref}
      onClick={handleClick}
      // Mark this link as self-capturing so MaskReveal's global click capture
      // skips it — otherwise the hold overlay would mount before handleClick
      // runs, causing a double-capture and visual flicker.
      // 标记此链接为自捕获，让 MaskReveal 全局 click 捕获跳过它 ——
      // 否则遮罩会在 handleClick 执行前挂载，导致双重捕获和视觉闪烁。
      data-nd-transition-capture
      className="mb-6 inline-flex items-center gap-2 text-fd-muted-foreground hover:text-fd-foreground transition-colors"
    >
      <ArrowLeft size={16} />
      {label}
    </Link>
  );
}
