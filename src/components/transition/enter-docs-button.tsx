// CTA button that triggers a mask-reveal page transition from the homepage
// to the docs area. On pointer-up/click capture, it snapshots the current
// <main> DOM into sessionStorage so MaskReveal can animate the clip-path reveal.
// Uses Link's native navigation instead of router.push to avoid RSC fetch
// being aborted by React state-driven re-renders.
// 触发遮罩揭示页面过渡的 CTA 按钮，从首页跳转至文档区。
// pointer-up / click capture 时将当前 <main> DOM 快照存入 sessionStorage，供 MaskReveal 执行裁剪揭示动画。
// 使用 Link 原生导航而非 router.push，避免 React 状态更新导致的重渲染中止 RSC 请求。

'use client';

import Link from 'next/link';
import { type MouseEvent, type PointerEvent, type ReactNode, useRef } from 'react';
import {
  captureTransitionSnapshot,
  captureTransitionSnapshotAtPoint,
  isPlainPrimaryActivation,
  resolveActivationPoint,
} from '@/lib/transition-snapshot';

export default function EnterDocsButton({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const hasPrimedSnapshotRef = useRef(false);

  const handlePointerUpCapture = (event: PointerEvent<HTMLAnchorElement>) => {
    if (!isPlainPrimaryActivation(event)) {
      return;
    }

    const { x, y } = resolveActivationPoint(event, event.currentTarget);
    hasPrimedSnapshotRef.current = true;

    // Pointer-up fires before the following click event, so the hold overlay
    // is already in the DOM before Next Link begins client navigation.
    // pointer-up 早于随后派发的 click，因此保底遮罩会先于 Next Link
    // 客户端导航进入 DOM。
    captureTransitionSnapshotAtPoint(x, y);
  };

  const handleClickCapture = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isPlainPrimaryActivation(event)) {
      return;
    }

    if (hasPrimedSnapshotRef.current) {
      hasPrimedSnapshotRef.current = false;
      return;
    }

    // Keyboard activation has no pointer-up, so keep click-capture as the
    // accessibility fallback before Next Link's bubble-phase navigation.
    // 键盘触发没有 pointer-up，因此保留 click capture 作为无障碍兜底，
    // 仍先于 Next Link 冒泡阶段导航执行。
    captureTransitionSnapshot(event);

    // Do NOT call e.preventDefault() or router.push() here.
    // Let the <Link> handle navigation natively — calling router.push
    // alongside a React state update causes the ?_rsc= fetch to be aborted.
    // 不要调用 e.preventDefault() 或 router.push()。
    // 让 <Link> 原生处理导航 — 在 React 状态更新旁调用 router.push
    // 会导致 ?_rsc= 请求被中止。
  };

  return (
    <Link
      href={href}
      className={className}
      onPointerUpCapture={handlePointerUpCapture}
      onClickCapture={handleClickCapture}
      // Mark this link as self-capturing so MaskReveal's global click capture
      // skips it — this component primes the hold overlay before Next Link
      // starts navigation, with click-capture kept for keyboard activation.
      // 标记此链接为自捕获，让 MaskReveal 全局 click 捕获跳过它 ——
      // 本组件会在 Next Link 导航前预先铺好遮罩，并用 click capture 兜底键盘触发。
      data-nd-transition-capture
    >
      <span className="inline-block transition-all duration-300 ease-out">{children}</span>
    </Link>
  );
}
