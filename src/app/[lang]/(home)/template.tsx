// Per-locale page transition wrapper for home routes.
// 首页路由组的按语言页面过渡封装。
'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  releaseRouteLoadingHandoff,
  shouldSuppressHomeRouteEntry,
} from '@/features/transition';
import { useNavigationSnapshot } from '@/runtime/navigation/use-navigation';

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const navigation = useNavigationSnapshot();

  const [restoreKey, setRestoreKey] = useState(0);
  const [isPageCacheRestore, setIsPageCacheRestore] = useState(false);
  const isManagedTransition = navigation.phase !== 'idle';
  const restoreFrameRef = useRef<number | null>(null);
  const [hasSuppressedDirectEntry, setHasSuppressedDirectEntry] = useState(isManagedTransition);
  const suppressDirectEntry = shouldSuppressHomeRouteEntry(
    hasSuppressedDirectEntry,
    isManagedTransition,
    isPageCacheRestore,
  );

  useEffect(() => {
    if (isManagedTransition || isPageCacheRestore) setHasSuppressedDirectEntry(true);
  }, [isManagedTransition, isPageCacheRestore]);

  // Release the cloned root loading screen after the home route has mounted,
  // smoothing the first "/" → "/{locale}" handoff.
  // 首页路由挂载后释放克隆的根加载画面，平滑 "/" → "/{locale}" 的首次交接。
  useEffect(() => {
    releaseRouteLoadingHandoff();
  }, []);

  // BFCache restore can resume a frozen framer-motion node before its enter
  // animation reaches the visible frame, leaving HomeLayout's nav visible but
  // homepage content transparent. Remount the motion boundary and skip the
  // initial frame on persisted history restores.
  // BFCache 恢复可能把 framer-motion 节点停在入场动画的不可见帧，导致
  // HomeLayout 导航可见但首页正文透明。历史缓存恢复时重挂 motion 边界，
  // 并跳过初始不可见帧。
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;

      releaseRouteLoadingHandoff();
      setIsPageCacheRestore(true);
      setRestoreKey((key) => key + 1);
      if (restoreFrameRef.current !== null) {
        window.cancelAnimationFrame(restoreFrameRef.current);
      }
      restoreFrameRef.current = window.requestAnimationFrame(() => {
        setIsPageCacheRestore(false);
        restoreFrameRef.current = null;
      });
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      if (restoreFrameRef.current !== null) {
        window.cancelAnimationFrame(restoreFrameRef.current);
      }
    };
  }, []);

  return (
    <div
      key={`${pathname}-${restoreKey}`}
      // The global transition provider owns cross-route entry motion; this
      // shell only handles direct loads and BFCache-safe remounting.
      // 跨路由入场由全局转场 Provider 管理，本外壳仅处理直达加载与 BFCache 安全重挂载。
      className={`home-route-shell${suppressDirectEntry ? '' : ' home-route-shell--enter'}`}
    >
      {children}
    </div>
  );
}
