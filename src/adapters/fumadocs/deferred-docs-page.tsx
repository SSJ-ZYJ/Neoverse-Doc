// DocsPage wrapper retains the current Fumadocs TOC until the next route commits.
// DocsPage 包装器会保留当前 Fumadocs TOC，直到下一条路由完成提交。
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
import { type ComponentProps, createContext, useContext, useEffect, useState } from 'react';
import { useNavigationSnapshot } from '@/runtime/navigation/use-navigation';
import {
  advanceDeferredTocState,
  type DeferredTocPhase,
  type DeferredTocState,
} from './deferred-toc-state';
import { getDocsTocElement } from './dom';

const DeferredTocPhaseContext = createContext<DeferredTocPhase>('visible');

function mergeClassName(current: string | undefined, addition: string): string {
  return current ? `${current} ${addition}` : addition;
}

function DeferredTOCProvider({ toc, children, ...props }: TOCProviderProps) {
  const pathname = usePathname();
  const navigation = useNavigationSnapshot();
  const [state, setState] = useState<DeferredTocState<TOCProviderProps['toc']>>(() => ({
    path: pathname,
    phase: 'visible',
    toc,
  }));

  useEffect(() => {
    setState((current) => advanceDeferredTocState(current, navigation.phase, pathname, toc));
  }, [navigation.phase, pathname, toc]);

  return (
    <DeferredTocPhaseContext value={state.phase}>
      <FumadocsTOCProvider {...props} toc={state.toc}>
        {children}
      </FumadocsTOCProvider>
    </DeferredTocPhaseContext>
  );
}

function DeferredTOC(props: ComponentProps<typeof FumadocsTOC>) {
  const phase = useContext(DeferredTocPhaseContext);

  useEffect(() => {
    void phase;
    const container = getDocsTocElement();
    if (!container) return;

    let previousScrollY = window.scrollY;
    let direction: 'down' | 'up' = 'down';
    container.dataset.docsTocScrollDirection = direction;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY === previousScrollY) return;

      const nextDirection = currentScrollY > previousScrollY ? 'down' : 'up';
      previousScrollY = currentScrollY;
      if (nextDirection === direction) return;

      direction = nextDirection;
      container.dataset.docsTocScrollDirection = direction;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      delete container.dataset.docsTocScrollDirection;
    };
  }, [phase]);

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
