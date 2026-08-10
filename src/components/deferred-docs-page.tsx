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
  useContext,
  useEffect,
  useState,
} from 'react';

const ROUTE_TRANSITION_ATTRIBUTES = [
  'data-nd-route-transition',
  'data-nd-route-transition-pending',
  'data-nd-route-transition-outgoing',
  'data-nd-route-transition-capturing',
  'data-nd-route-transition-particles',
] as const;

const DeferredTocReadyContext = createContext(false);

function hasActiveRouteTransition(root: HTMLElement): boolean {
  return ROUTE_TRANSITION_ATTRIBUTES.some((attribute) => root.hasAttribute(attribute));
}

function mergeClassName(current: string | undefined, addition: string): string {
  return current ? `${current} ${addition}` : addition;
}

function DeferredTOCProvider({ toc, children, ...props }: TOCProviderProps) {
  const pathname = usePathname();
  const [readyPath, setReadyPath] = useState<string | null>(() => {
    // Keep the complete TOC in direct-load static HTML. Client-side route
    // transitions either retain the previous pathname state or initialize
    // while the transition marker is active, so the destination still defers.
    // 直达页面的静态 HTML 保留完整 TOC；客户端转场会沿用上一条路径状态，
    // 或在转场标记存在时初始化，因此目标页仍会延迟目录。
    if (typeof document === 'undefined') return pathname;
    return hasActiveRouteTransition(document.documentElement) ? null : pathname;
  });
  const ready = readyPath === pathname;

  useEffect(() => {
    const root = document.documentElement;
    let frameId = 0;

    const release = () => {
      if (hasActiveRouteTransition(root)) return;
      if (frameId) window.cancelAnimationFrame(frameId);
      // Mount on the frame after transition cleanup so TOC layout and tracking
      // cannot compete with the animation's final paint.
      // 在转场清理后的下一帧挂载，避免 TOC 布局与追踪工作争抢动画最后一帧。
      frameId = window.requestAnimationFrame(() => setReadyPath(pathname));
    };

    const observer = new MutationObserver(release);
    observer.observe(root, {
      attributes: true,
      attributeFilter: [...ROUTE_TRANSITION_ATTRIBUTES],
    });
    release();

    return () => {
      observer.disconnect();
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [pathname]);

  return (
    <DeferredTocReadyContext value={ready}>
      <FumadocsTOCProvider {...props} toc={ready ? toc : []}>
        {children}
      </FumadocsTOCProvider>
    </DeferredTocReadyContext>
  );
}

function DeferredTOC(props: ComponentProps<typeof FumadocsTOC>) {
  const ready = useContext(DeferredTocReadyContext);
  if (!ready) {
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
        className: mergeClassName(props.container?.className, 'docs-toc-deferred-enter'),
      }}
    />
  );
}

function DeferredTOCPopover(props: ComponentProps<typeof FumadocsTOCPopover>) {
  const ready = useContext(DeferredTocReadyContext);
  if (!ready) {
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
        className: mergeClassName(props.container?.className, 'docs-toc-deferred-enter'),
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
