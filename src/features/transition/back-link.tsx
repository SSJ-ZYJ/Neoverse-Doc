// Declarative back link keeps route intent deterministic so Next.js can
// prefetch the destination and the centralized transition can prepare early.
// 声明式返回链接固定导航目标，让 Next.js 可预取页面并使集中式转场提前准备。

import { ArrowLeft } from 'lucide-react';
import { TransitionLink } from './transition-link';

interface BackLinkProps {
  href: string;
  label: string;
}

export function BackLink({ href, label }: BackLinkProps) {
  return (
    <TransitionLink href={href} className="special-page__back-link">
      <ArrowLeft size={16} />
      {label}
    </TransitionLink>
  );
}
