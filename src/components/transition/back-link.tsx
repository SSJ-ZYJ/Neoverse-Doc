// Client-side back link that returns to the previous page when navigation
// history exists, falling back to a provided href otherwise. Mirrors the
// EnterDocsButton mask-reveal protocol: snapshots <main> into sessionStorage
// before navigating so the docs layout's MaskReveal can play the transition.
// 客户端返回链接：存在浏览历史时回到上一页，否则跳转至 fallback。
// 与 EnterDocsButton 对称的遮罩揭示协议：导航前将 <main> 快照写入 sessionStorage，
// 让文档区 layout 中的 MaskReveal 在挂载时播放过渡动画。

'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { captureTransitionSnapshot } from '@/lib/transition-snapshot';

interface BackLinkProps {
  fallbackHref: string;
  label: string;
}

export function BackLink({ fallbackHref, label }: BackLinkProps) {
  const router = useRouter();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Snapshot the current <main> so MaskReveal (mounted in docs/layout.tsx)
    // can expand a radial cutout from the return button outward, revealing the
    // destination docs page beneath a snapshot of the guestbook just left.
    // 快照当前 <main>，供 docs/layout.tsx 中挂载的 MaskReveal 从返回按钮位置
    // 向外扩展遮罩：内圈揭示目标文档页，外圈展示用户刚离开的留言板快照。
    captureTransitionSnapshot(event);

    // If there's navigation history, intercept the Link click and go back
    // so the browser restores scroll position and previous state.
    // 存在浏览历史时拦截 Link 点击并后退，
    // 让浏览器恢复滚动位置与上一页状态。
    if (typeof window !== 'undefined' && window.history.length > 1) {
      event.preventDefault();
      router.back();
    }
  };

  return (
    <Link
      href={fallbackHref}
      onClick={handleClick}
      className="mb-6 inline-flex items-center gap-2 text-fd-muted-foreground hover:text-fd-foreground transition-colors"
    >
      <ArrowLeft size={16} />
      {label}
    </Link>
  );
}
