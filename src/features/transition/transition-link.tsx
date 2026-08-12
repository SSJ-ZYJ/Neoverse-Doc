// Unified internal link API. The provider owns policy and capture behavior;
// this component only declares an optional semantic transition override.
// 统一内部链接 API：Provider 负责策略与捕获，本组件仅声明可选转场语义。

import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import type { TransitionKind } from './transition-types';

interface TransitionLinkProps
  extends LinkProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | 'href'> {
  children: ReactNode;
  transition?: TransitionKind;
}

export function TransitionLink({ children, transition = 'auto', ...props }: TransitionLinkProps) {
  return (
    <Link {...props} data-transition={transition}>
      {children}
    </Link>
  );
}
