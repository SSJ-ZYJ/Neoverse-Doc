// Central transition protocol: captures route intent, retains an in-memory DOM
// clone until the target commits, then runs the policy-selected reveal.
// 集中式转场协议：捕获路由意图，以内存 DOM 克隆保留来源页，目标提交后按策略揭示。
'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { TRANSITION_DURATION_MS, TRANSITION_TIMEOUT_MS } from '@/lib/motion-config';
import {
  calculateRevealRadius,
  cloneTransitionSource,
  isPlainInternalNavigation,
  resolveEventOrigin,
} from './transition-controller';
import { TransitionLayer } from './transition-layer';
import { isSamePageHashNavigation, selectTransition } from './transition-policy';
import type { TransitionIntent, TransitionKind } from './transition-types';

interface TransitionProviderProps {
  children: ReactNode;
}

export function TransitionProvider({ children }: TransitionProviderProps) {
  const pathname = usePathname();
  const layerRef = useRef<HTMLDivElement>(null);
  const intentRef = useRef<TransitionIntent | null>(null);
  const cleanupTimerRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (cleanupTimerRef.current !== null) window.clearTimeout(cleanupTimerRef.current);
    cleanupTimerRef.current = null;
    intentRef.current = null;
    document.documentElement.removeAttribute('data-nd-route-transition');
    document.documentElement.removeAttribute('data-nd-route-transition-pending');
    const layer = layerRef.current;
    if (!layer) return;
    layer.replaceChildren();
    layer.hidden = true;
    layer.dataset.phase = 'idle';
    layer.removeAttribute('data-transition');
    layer.style.removeProperty('--transition-origin-x');
    layer.style.removeProperty('--transition-origin-y');
    layer.style.removeProperty('--transition-max-radius');
  }, []);

  const prepare = useCallback(
    (anchor: HTMLAnchorElement, event: MouseEvent) => {
      const explicit = anchor.dataset.transition as TransitionKind | undefined;
      const targetUrl = new URL(anchor.href, window.location.href);
      const sourcePath = window.location.pathname;
      const targetPath = targetUrl.pathname;
      const kind =
        explicit && explicit !== 'auto' ? explicit : selectTransition(sourcePath, targetPath);
      if (
        kind === 'none' ||
        isSamePageHashNavigation(window.location.href, targetUrl.href) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }

      cleanup();
      const origin = resolveEventOrigin(event, anchor);
      intentRef.current = { kind, origin, sourcePath, targetPath };
      // Mark the navigation before the target template mounts so its direct-load
      // animation cannot stack on top of the provider-owned route transition.
      // 在目标模板挂载前标记导航，避免直达加载动画与 Provider 路由转场重复叠加。
      document.documentElement.dataset.ndRouteTransitionPending = kind;
      const layer = layerRef.current;
      // Only aperture transitions need a DOM snapshot in the layer (the radial
      // mask reveals the cloned source page). Overview, surface, and crossfade
      // rely on the target page's own enter animation; showing a clone of the
      // source page here creates a jarring "flash back" frame when leaving docs.
      // 只有 aperture 转场需要在转场层中保留 DOM 快照（径向遮罩揭示克隆的源页面）。
      // overview、surface、crossfade 依赖目标页自身的入场动画；在此显示源页面克隆
      // 会在离开文档页时产生刺眼的"闪回"帧。
      if (layer && kind === 'aperture') {
        const clone = cloneTransitionSource();
        if (clone) layer.replaceChildren(clone);
        layer.hidden = false;
        layer.dataset.phase = 'preparing';
        layer.dataset.transition = kind;
        layer.style.setProperty('--transition-origin-x', `${origin.x}px`);
        layer.style.setProperty('--transition-origin-y', `${origin.y}px`);
        layer.style.setProperty(
          '--transition-max-radius',
          `${calculateRevealRadius(origin) + Math.min(Math.max(window.innerWidth * 0.07, 48), 140)}px`,
        );
      }

      cleanupTimerRef.current = window.setTimeout(cleanup, TRANSITION_TIMEOUT_MS.navigation);
    },
    [cleanup],
  );

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.closest('#nd-transition-layer') || anchor.dataset.transition === 'none')
        return;
      if (!isPlainInternalNavigation(event, anchor)) return;
      if (intentRef.current) {
        event.preventDefault();
        return;
      }
      prepare(anchor, event);
    };

    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, [prepare]);

  useLayoutEffect(() => {
    const intent = intentRef.current;
    if (!intent || pathname === intent.sourcePath) return;

    const resolvedKind = selectTransition(intent.sourcePath, pathname);
    if (resolvedKind === 'none') {
      cleanup();
      return;
    }

    intent.kind = resolvedKind;
    document.documentElement.dataset.ndRouteTransition = resolvedKind;
    const layer = layerRef.current;
    // Keep the DOM-snapshot layer revealing only for aperture. Other transitions
    // intentionally leave the layer hidden so the target page's enter animation
    // is the only visual change.
    // 仅对 aperture 保持 DOM 快照转场层的 revealing 态。其他转场故意让转场层
    // 保持隐藏，目标页的入场动画成为唯一的视觉变化。
    if (layer && resolvedKind === 'aperture') {
      layer.dataset.transition = resolvedKind;
      layer.dataset.phase = 'revealing';
    }

    const duration = TRANSITION_DURATION_MS[resolvedKind];
    cleanupTimerRef.current = window.setTimeout(
      cleanup,
      duration + TRANSITION_TIMEOUT_MS.settleBuffer,
    );
  }, [cleanup, pathname]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) cleanup();
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [cleanup]);

  return (
    <>
      <TransitionLayer ref={layerRef} />
      {children}
    </>
  );
}
