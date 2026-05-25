// Client-side back link that returns to the previous page when navigation
// history exists, falling back to a provided href otherwise.
// 客户端返回链接：存在浏览历史时回到上一页，否则跳转至 fallback。

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
