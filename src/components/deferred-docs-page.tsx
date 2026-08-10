// DocsPage wrapper defers Fumadocs TOC work until the route transition settles.
// DocsPage 包装器会将 Fumadocs TOC 工作延迟到路由转场完全结束后。
'use client';

import type { DocsPageProps } from 'fumadocs-ui/layouts/docs/page';
import { DocsPage } from 'fumadocs-ui/layouts/docs/page';
import {
  TOC as FumadocsTOC,
  TOCPopover as FumadocsTOCPopover,
  TOCProvider as FumadocsTOCProvider,
  type TOCProviderProps,
} from 'fumadocs-ui/layouts/docs/page/slots/toc';
import { usePathname } from 'next/navigation';
import {
  type ComponentProps,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ROUTE_TRANSITION_START_EVENT } from '@/components/transition/transition-types';
import { MOTION_DURATION_MS } from '@/lib/motion-config';

const ROUTE_TRANSITION_ATTRIBUTES = [
  'data-nd-route-transition',
  'data-nd-route-transition-pending',
  'data-nd-route-transition-outgoing',
  'data-nd-route-transition-capturing',
  'data-nd-route-transition-particles',
] as const;

type DeferredTocPhase = 'visible' | 'exiting' | 'hidden' | 'entering';

interface DeferredTocState {
  path: string;
  phase: DeferredTocPhase;
  toc: TOCProviderProps['toc'];
}

const DeferredTocPhaseContext = createContext<DeferredTocPhase>('hidden');

function hasActiveRouteTransition(root: HTMLElement): boolean {
  return ROUTE_TRANSITION_ATTRIBUTES.some((attribute) => root.hasAttribute(attribute));
}

function mergeClassName(current: string | undefined, addition: string): string {
  return current ? `${current} ${addition}` : addition;
}

function DeferredTOCProvider({ toc, children, ...props }: TOCProviderProps) {
  const pathname = usePathname();
  const [state, setState] = useState<DeferredTocState>(() => {
    // Keep the complete TOC in direct-load static HTML. Client-side route
    // transitions either retain the previous pathname state or initialize
    // while the transition marker is active, so the destination still defers.
    // 直达页面的静态 HTML 保留完整 TOC；客户端转场会沿用上一条路径状态，
    // 或在转场标记存在时初始化，因此目标页仍会延迟目录。
    const phase =
      typeof document === 'undefined' || !hasActiveRouteTransition(document.documentElement)
        ? 'visible'
        : 'hidden';
    return { path: pathname, phase, toc };
  });
  const stateRef = useRef(state);
  const pathnameRef = useRef(pathname);
  const tocRef = useRef(toc);
  stateRef.current = state;
  pathnameRef.current = pathname;
  tocRef.current = toc;

  const updateState = useCallback((nextState: DeferredTocState) => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    let frameId = 0;
    let exitTimerId = 0;
    let enterTimerId = 0;

    const clearEnterWork = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      if (enterTimerId) window.clearTimeout(enterTimerId);
      frameId = 0;
      enterTimerId = 0;
    };

    const startExit = () => {
      clearEnterWork();
      const current = stateRef.current;
      if (current.phase === 'hidden' || current.phase === 'exiting') return;

      updateState({ ...current, phase: 'exiting' });
      if (exitTimerId) window.clearTimeout(exitTimerId);
      exitTimerId = window.setTimeout(() => {
        exitTimerId = 0;
        updateState({ ...stateRef.current, phase: 'hidden' });
      }, MOTION_DURATION_MS.fast);
    };

    const release = () => {
      if (hasActiveRouteTransition(root)) {
        startExit();
        return;
      }
      if (stateRef.current.path === pathnameRef.current && stateRef.current.phase === 'visible') {
        return;
      }
      if (exitTimerId) window.clearTimeout(exitTimerId);
      exitTimerId = 0;
      clearEnterWork();
      // Mount on the frame after transition cleanup so TOC layout and tracking
      // cannot compete with the animation's final paint.
      // 在转场清理后的下一帧挂载，避免 TOC 布局与追踪工作争抢动画最后一帧。
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updateState({ path: pathnameRef.current, phase: 'entering', toc: tocRef.current });
        enterTimerId = window.setTimeout(() => {
          enterTimerId = 0;
          updateState({ ...stateRef.current, phase: 'visible' });
        }, MOTION_DURATION_MS.fast);
      });
    };

    const observer = new MutationObserver(release);
    observer.observe(root, {
      attributes: true,
      attributeFilter: [...ROUTE_TRANSITION_ATTRIBUTES],
    });
    document.addEventListener(ROUTE_TRANSITION_START_EVENT, startExit);
    release();

    return () => {
      observer.disconnect();
      document.removeEventListener(ROUTE_TRANSITION_START_EVENT, startExit);
      clearEnterWork();
      if (exitTimerId) window.clearTimeout(exitTimerId);
    };
  }, [updateState]);

  useEffect(() => {
    // Navigations without a visual transition have no root marker to observe.
    // Switch their TOC at commit without manufacturing an animation.
    // 无视觉转场的导航不会产生根节点标记；此时在提交后直接切换 TOC，
    // 不额外制造动画。
    if (hasActiveRouteTransition(document.documentElement)) return;
    if (stateRef.current.path === pathname) return;
    updateState({ path: pathname, phase: 'visible', toc: tocRef.current });
  }, [pathname, updateState]);

  const phase =
    state.path === pathname || state.phase === 'exiting' ? state.phase : ('hidden' as const);
  const mounted = phase !== 'hidden';

  return (
    <DeferredTocPhaseContext value={phase}>
      <FumadocsTOCProvider {...props} toc={mounted ? state.toc : []}>
        {children}
      </FumadocsTOCProvider>
    </DeferredTocPhaseContext>
  );
}

function DeferredTOC(props: ComponentProps<typeof FumadocsTOC>) {
  const phase = useContext(DeferredTocPhaseContext);
  if (phase === 'hidden') {
    // Mirror the native empty-TOC placeholder so the desktop grid keeps its
    // reserved column while the real TOC is deferred.
    // 复用原生空目录占位，延迟期间仍为桌面 Grid 保留目录列。
    return <div className="hidden xl:layout:[--fd-toc-width:268px]" id="nd-toc-placeholder" />;
  }

  return (
    <FumadocsTOC
      {...props}
      container={{
        ...props.container,
        className: mergeClassName(props.container?.className, `docs-toc-deferred-${phase}`),
      }}
    />
  );
}

function DeferredTOCPopover(props: ComponentProps<typeof FumadocsTOCPopover>) {
  const phase = useContext(DeferredTocPhaseContext);
  if (phase === 'hidden') {
    // Preserve the mobile TOC grid row without mounting its interactive tree.
    // 保留移动端目录 Grid 行，但暂不挂载交互目录树。
    return (
      <div
        aria-hidden="true"
        className="sticky top-(--fd-docs-row-2) [grid-area:toc-popover] h-(--fd-toc-popover-height) xl:hidden max-xl:layout:[--fd-toc-popover-height:--spacing(10)]"
        data-deferred-docs-toc-placeholder=""
      />
    );
  }

  return (
    <FumadocsTOCPopover
      {...props}
      container={{
        ...props.container,
        className: mergeClassName(props.container?.className, `docs-toc-deferred-${phase}`),
      }}
    />
  );
}

const deferredTocSlots = {
  provider: DeferredTOCProvider,
  main: DeferredTOC,
  popover: DeferredTOCPopover,
};

export function DeferredDocsPage(props: DocsPageProps) {
  return (
    <DocsPage
      {...props}
      slots={{
        ...props.slots,
        toc: deferredTocSlots,
      }}
    />
  );
}
