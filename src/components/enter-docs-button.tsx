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

    // 立刻给予定格反馈
    setIsClicked(true);

    // 【极限黑魔法】放弃所有昂贵阻塞的图片截图分析。
    // 在这 1 毫秒内，直接把当前屏幕里的原生态 DOM 节点外壳克隆下来，作为字符串存入缓存！
    // 这样不用消耗任何电脑 CPU，新页面挂载时通过 dangerouslySetInnerHTML 直接还原 100% 同款主页。
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

    // 路由交给后台处理
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {/* 给予极致干脆的触觉物理反馈 */}
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
