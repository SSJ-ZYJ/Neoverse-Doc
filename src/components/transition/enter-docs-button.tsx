// CTA button that triggers a mask-reveal page transition from the homepage
// to the docs area. On click, it snapshots the current <main> DOM into
// sessionStorage so MaskReveal can animate the clip-path reveal.
// Uses Link's native navigation instead of router.push to avoid RSC fetch
// being aborted by React state-driven re-renders.
// 触发遮罩揭示页面过渡的 CTA 按钮，从首页跳转至文档区。
// 点击时将当前 <main> DOM 快照存入 sessionStorage，供 MaskReveal 执行裁剪揭示动画。
// 使用 Link 原生导航而非 router.push，避免 React 状态更新导致的重渲染中止 RSC 请求。

'use client';

import Link from 'next/link';
import { type MouseEvent, type ReactNode, useRef } from 'react';
import { captureTransitionSnapshot } from '@/lib/transition-snapshot';

export default function EnterDocsButton({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Provide immediate tactile feedback via direct DOM manipulation
    // (avoids React state update that could abort the in-flight RSC fetch).
    // Must happen BEFORE the snapshot so the scaled-down span is captured.
    // 通过直接 DOM 操作提供即时触觉反馈
    // （避免 React 状态更新触发重渲染，从而中止进行中的 RSC 请求）。
    // 必须在快照之前执行，使缩小后的 span 被捕获进快照。
    if (spanRef.current) {
      spanRef.current.style.transform = 'scale(0.92)';
      spanRef.current.style.opacity = '0.7';
    }

    // Snapshot the current <main> (including the tactile feedback above) so
    // MaskReveal on the destination page can play the radial cutout reveal.
    // 快照当前 <main>（含上方触觉反馈），供目标页 MaskReveal 播放径向镂空揭示。
    captureTransitionSnapshot(e);

    // Do NOT call e.preventDefault() or router.push() here.
    // Let the <Link> handle navigation natively — calling router.push
    // alongside a React state update causes the ?_rsc= fetch to be aborted.
    // 不要调用 e.preventDefault() 或 router.push()。
    // 让 <Link> 原生处理导航 — 在 React 状态更新旁调用 router.push
    // 会导致 ?_rsc= 请求被中止。
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      <span ref={spanRef} className="inline-block transition-all duration-300 ease-out">
        {children}
      </span>
    </Link>
  );
}
