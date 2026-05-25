// CTA button that triggers a mask-reveal page transition from the homepage
// to the docs area. On click, it snapshots the current <main> DOM into
// sessionStorage so MaskReveal can animate the clip-path reveal.
// 触发遮罩揭示页面过渡的 CTA 按钮，从首页跳转至文档区。
// 点击时将当前 <main> DOM 快照存入 sessionStorage，供 MaskReveal 执行裁剪揭示动画。

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type MouseEvent, type ReactNode, useState, useTransition } from 'react';

export default function EnterDocsButton({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (isClicked) return;

    let x = e.clientX;
    let y = e.clientY;

    if (x === 0 && y === 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    // Provide immediate tactile feedback / 立刻给予定格反馈
    setIsClicked(true);

    // Clone the current native DOM shell as a string and cache it;
    // the new page restores it via dangerouslySetInnerHTML on mount.
    // 把当前屏幕里的原生态 DOM 节点外壳克隆下来，作为字符串存入缓存
    // 新页面挂载时通过 dangerouslySetInnerHTML 直接还原
    const mainNode = document.querySelector('main');

    if (mainNode) {
      const data = {
        x,
        y,
        domHTML: mainNode.outerHTML,
        ts: Date.now(),
        isTransitioning: true,
      };
      sessionStorage.setItem('nd-docs-transition', JSON.stringify(data));
    }

    // Hand off routing to the background / 路由交给后台处理
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {/* Crisp tactile physical feedback / 给予极致干脆的触觉物理反馈 */}
      <span
        className="inline-block transition-all duration-300 ease-out"
        style={{
          transform: isClicked ? 'scale(0.92)' : 'scale(1)',
          opacity: isClicked ? 0.7 : 1,
        }}
      >
        {children}
      </span>
    </Link>
  );
}
