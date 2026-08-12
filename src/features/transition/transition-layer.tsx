// Single inert visual layer reused by every route transition.
// 所有路由转场复用的单一、不可交互视觉层。
'use client';

import { forwardRef } from 'react';

export const TransitionLayer = forwardRef<HTMLDivElement>(function TransitionLayer(_, ref) {
  return <div aria-hidden="true" data-phase="idle" hidden id="nd-transition-layer" ref={ref} />;
});
