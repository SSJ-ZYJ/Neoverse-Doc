// Central transition protocol: captures route intent, retains an in-memory DOM
// clone until the target commits, then runs the policy-selected reveal.
// 集中式转场协议：捕获路由意图，以内存 DOM 克隆保留来源页，目标提交后按策略揭示。
'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  MOTION_DURATION_MS,
  TRANSITION_DURATION_MS,
  TRANSITION_TIMEOUT_MS,
} from '@/lib/motion-config';
import {
  type ContentParticleTransition,
  createContentParticleTransition,
  prewarmContentParticleRenderer,
} from './content-particle-transition';
import {
  calculateRevealRadius,
  cloneTransitionSource,
  isPlainInternalNavigation,
  resolveEventOrigin,
} from './transition-controller';
import { TransitionLayer } from './transition-layer';
import { isDocsRoute, isSamePageHashNavigation, selectTransition } from './transition-policy';
import type { TransitionIntent, TransitionKind } from './transition-types';

interface TransitionProviderProps {
  children: ReactNode;
}

export function TransitionProvider({ children }: TransitionProviderProps) {
  const pathname = usePathname();
  const layerRef = useRef<HTMLDivElement>(null);
  const intentRef = useRef<TransitionIntent | null>(null);
  const contentParticleRef = useRef<ContentParticleTransition | null>(null);
  const cleanupTimerRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (cleanupTimerRef.current !== null) window.clearTimeout(cleanupTimerRef.current);
    cleanupTimerRef.current = null;
    intentRef.current = null;
    contentParticleRef.current?.destroy();
    contentParticleRef.current = null;
    document.documentElement.removeAttribute('data-nd-route-transition');
    document.documentElement.removeAttribute('data-nd-route-transition-pending');
    document.documentElement.removeAttribute('data-nd-route-transition-outgoing');
    document.documentElement.removeAttribute('data-nd-route-transition-capturing');
    document.documentElement.removeAttribute('data-nd-route-transition-particles');
    document.documentElement.style.removeProperty('--nd-content-outgoing-opacity');
    const layer = layerRef.current;
    if (!layer) return;
    // Explicitly reset will-change on clones before removing them. This ensures
    // the browser releases the compositing layer immediately, rather than
    // relying on implicit cleanup after replaceChildren. Important edge cases:
    // if cleanup runs while the tab is hidden (setTimeout may be throttled),
    // the clone could retain its compositing layer longer than necessary.
    // 在移除克隆前显式重置 will-change，确保浏览器立即释放合成层，
    // 而非依赖 replaceChildren 后的隐式清理。重要边界情况：若 cleanup
    // 在标签页隐藏时运行（setTimeout 可能被节流），克隆可能不必要地
    // 保留合成层更长时间。
    const clones = layer.querySelectorAll<HTMLElement>('.nd-transition-clone');
    clones.forEach((clone) => {
      clone.style.willChange = 'auto';
    });
    layer.replaceChildren();
    layer.hidden = true;
    layer.dataset.phase = 'idle';
    layer.removeAttribute('data-transition');
    layer.style.removeProperty('--transition-origin-x');
    layer.style.removeProperty('--transition-origin-y');
    layer.style.removeProperty('--transition-max-radius');
  }, []);

  const scheduleCleanup = useCallback(
    (intent: TransitionIntent, delay: number) => {
      if (cleanupTimerRef.current !== null) window.clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = window.setTimeout(() => {
        if (intentRef.current === intent) cleanup();
      }, delay);
    },
    [cleanup],
  );

  const prepare = useCallback(
    (anchor: HTMLAnchorElement, event: MouseEvent) => {
      const explicit = anchor.dataset.transition as TransitionKind | undefined;
      const targetUrl = new URL(anchor.href, window.location.href);
      const sourcePath = window.location.pathname;
      const targetPath = targetUrl.pathname;
      const kind =
        explicit && explicit !== 'auto' ? explicit : selectTransition(sourcePath, targetPath);
      // Hash navigation does not replace the page and can run independently of
      // an in-flight route transition. A route navigation without motion still
      // supersedes the previous intent, so release its visual state before the
      // browser or Next.js handles the new destination.
      // 哈希导航不会替换页面，可与进行中的路由转场独立执行。无动画的路由导航
      // 仍会取代旧意图，因此在浏览器或 Next.js 处理新目标前先释放旧视觉状态。
      if (isSamePageHashNavigation(window.location.href, targetUrl.href)) return;
      if (kind === 'none' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        cleanup();
        return;
      }

      const origin = resolveEventOrigin(event, anchor);
      const intent = { kind, origin, sourcePath, targetPath };
      const root = document.documentElement;
      const layer = layerRef.current;

      // Re-target clicks that occur before the first docs navigation commits.
      // The already-running outgoing card remains valid, so replacing it would
      // only restart the same dissolve and expose the hidden live article.
      // 首次文档导航提交前的连续点击仅更新目标；当前退场卡片仍然有效，替换它
      // 只会重启同一段消散并暴露已隐藏的实时正文。
      if (
        kind === 'content' &&
        contentParticleRef.current &&
        root.dataset.ndRouteTransitionOutgoing === 'content' &&
        !root.hasAttribute('data-nd-route-transition')
      ) {
        intentRef.current = intent;
        root.dataset.ndRouteTransitionPending = kind;
        scheduleCleanup(intent, TRANSITION_TIMEOUT_MS.navigation);
        return;
      }

      // Snapshot a partially faded destination before cleanup removes its
      // animation. The inline opacity on the clone preserves the exact frame
      // used as the next outgoing card during rapid navigation.
      // cleanup 移除淡入动画前先截取尚未完全显现的目标页；克隆上的内联透明度
      // 会保留该帧，作为快速切页时的下一张退场卡片。
      const outgoingOpacity =
        kind === 'content'
          ? getComputedStyle(document.querySelector<HTMLElement>('#nd-page > *') ?? document.body)
              .opacity
          : '1';
      const preparedContentTransition =
        layer && kind === 'content' ? createContentParticleTransition() : null;

      // Route transitions are latest-intent-wins: cleanup atomically cancels
      // the previous snapshot, timer, and root animation before this click
      // installs its own intent. The navigation itself remains unblocked.
      // 路由转场采用“最新意图优先”：cleanup 会原子化取消旧快照、计时器与
      // 根节点动画，再由本次点击建立新意图；导航本身始终保持可响应。
      cleanup();
      intentRef.current = intent;
      // Mark the navigation before the target template mounts so its direct-load
      // animation cannot stack on top of the provider-owned route transition.
      // 在目标模板挂载前标记导航，避免直达加载动画与 Provider 路由转场重复叠加。
      root.dataset.ndRouteTransitionPending = kind;
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
      } else if (layer && kind === 'content') {
        // Capture the complete visible article card and start its particle exit
        // as soon as the first WebGL frame is ready. Keeping the live source
        // visible until that frame prevents a blank flash on rapid navigation.
        // 捕获完整的可见正文卡片，并在首个 WebGL 帧就绪后立即开始粒子退场；
        // 在此之前保留实时源卡片，避免快速切页时出现空白闪烁。
        const transition = preparedContentTransition;
        if (transition) {
          contentParticleRef.current = transition;
          layer.replaceChildren(transition.canvas);
          layer.hidden = true;
          layer.dataset.phase = 'preparing';
          layer.dataset.transition = kind;
          root.style.setProperty('--nd-content-outgoing-opacity', outgoingOpacity);
          root.dataset.ndRouteTransitionCapturing = kind;
          root.dataset.ndRouteTransitionParticles = kind;
          transition.play(() => {
            if (contentParticleRef.current !== transition) return;
            layer.hidden = false;
            if (!root.hasAttribute('data-nd-route-transition')) {
              layer.dataset.phase = 'navigating';
              root.dataset.ndRouteTransitionOutgoing = kind;
            }
            root.removeAttribute('data-nd-route-transition-capturing');
            root.style.removeProperty('--nd-content-outgoing-opacity');
          });
        }
      }

      scheduleCleanup(intent, TRANSITION_TIMEOUT_MS.navigation);
    },
    [cleanup, scheduleCleanup],
  );

  useEffect(() => {
    if (!isDocsRoute(pathname)) return;

    const idleWindow = window as unknown as {
      cancelIdleCallback?: (handle: number) => void;
      requestIdleCallback?: (callback: IdleRequestCallback) => number;
    };
    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(prewarmContentParticleRenderer);
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(prewarmContentParticleRenderer, 240);
    return () => window.clearTimeout(timeoutId);
  }, [pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.closest('#nd-transition-layer')) return;
      if (!isPlainInternalNavigation(event, anchor)) return;
      prepare(anchor, event);
    };

    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, [prepare]);

  useLayoutEffect(() => {
    const intent = intentRef.current;
    // An earlier navigation can finish after a newer click. Only the latest
    // intent's destination may consume and reveal the shared transition state.
    // 较早的导航可能在新点击后才完成；只有最新意图的目标页可以消费并揭示
    // 共享转场状态。
    if (!intent || pathname === intent.sourcePath || pathname !== intent.targetPath) return;

    const resolvedKind = selectTransition(intent.sourcePath, pathname);
    if (resolvedKind === 'none') {
      cleanup();
      return;
    }

    intent.kind = resolvedKind;
    document.documentElement.dataset.ndRouteTransition = resolvedKind;
    document.documentElement.removeAttribute('data-nd-route-transition-pending');
    document.documentElement.removeAttribute('data-nd-route-transition-outgoing');
    document.documentElement.removeAttribute('data-nd-route-transition-capturing');
    document.documentElement.style.removeProperty('--nd-content-outgoing-opacity');
    const layer = layerRef.current;
    // Keep the DOM-snapshot layer revealing only for aperture. Other transitions
    // intentionally leave the layer hidden so the target page's enter animation
    // is the only visual change.
    // 仅对 aperture 保持 DOM 快照转场层的 revealing 态。其他转场故意让转场层
    // 保持隐藏，目标页的入场动画成为唯一的视觉变化。
    if (layer && resolvedKind === 'aperture') {
      layer.dataset.transition = resolvedKind;
      layer.dataset.phase = 'revealing';
    } else if (layer && resolvedKind === 'content' && contentParticleRef.current) {
      layer.dataset.transition = resolvedKind;
      layer.dataset.phase = 'revealing';
    }

    const duration = TRANSITION_DURATION_MS[resolvedKind];
    const settleDuration =
      resolvedKind === 'content'
        ? Math.max(
            duration,
            MOTION_DURATION_MS.contentEnterDelay + MOTION_DURATION_MS.contentEnter,
          ) + TRANSITION_TIMEOUT_MS.settleBuffer
        : duration + TRANSITION_TIMEOUT_MS.settleBuffer;
    scheduleCleanup(intent, settleDuration);
  }, [cleanup, pathname, scheduleCleanup]);

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
