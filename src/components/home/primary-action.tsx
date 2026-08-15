// Primary homepage action combines the centralized transition link with the
// pointer-only magnet effect; keyboard and touch behavior stays native.
// 首页主操作组合集中式转场链接与仅指针磁吸效果；键盘和触摸保持原生行为。

import { ArrowUpRight } from 'lucide-react';
import { Magnet } from '@/components/react-bits/magnet';
import { TransitionLink } from '@/features/transition/transition-link';

interface PrimaryActionProps {
  href: string;
  label: string;
}

export function PrimaryAction({ href, label }: PrimaryActionProps) {
  return (
    <Magnet className="home-primary-action">
      <TransitionLink
        className="control-surface control-surface--primary home-cta"
        data-nd-interaction="cta"
        href={href}
        transition="aperture"
      >
        {label}
        <ArrowUpRight aria-hidden="true" size={17} />
      </TransitionLink>
    </Magnet>
  );
}
