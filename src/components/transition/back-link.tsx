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

interface BackLinkProps {
  fallbackHref: string;
  label: string;
}

export function BackLink({ fallbackHref, label }: BackLinkProps) {
  const router = useRouter();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (typeof window === 'undefined') return;

    // Capture the click point and current <main> outerHTML so MaskReveal
    // (mounted in docs/layout.tsx) can expand a radial cutout from the
    // return button outward, revealing the destination docs page beneath
    // a snapshot of the guestbook the user just left.
    // 记录点击坐标与当前 <main> 外层 HTML，供 docs/layout.tsx 中挂载的
    // MaskReveal 从返回按钮位置向外扩展遮罩：内圈揭示目标文档页，
    // 外圈展示用户刚离开的留言板快照。
    let x = event.clientX;
    let y = event.clientY;
    if (x === 0 && y === 0) {
      const rect = event.currentTarget.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    const mainNode = document.querySelector('main');
    if (mainNode) {
      const data = {
        x,
        y,
        domHTML: mainNode.outerHTML,
        scrollY: window.scrollY,
        ts: Date.now(),
        isTransitioning: true,
      };
      sessionStorage.setItem('nd-docs-transition', JSON.stringify(data));
    }

    if (window.history.length > 1) {
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
