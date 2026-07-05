// Per-locale page transition wrapper for home routes.
// 首页路由组的按语言页面过渡封装。
'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { releaseRouteLoadingHandoff } from '@/lib/route-loading-handoff';
import { isCrossRouteGroupTransition, readTransitionSnapshot } from '@/lib/transition-snapshot';

export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Only skip the entry animation when arriving via a cross-route-group
  // mask-reveal transition (e.g., docs → home). Within-group transitions
  // (e.g., guestbook → home via BackLink) have a snapshot but should still
  // play page-enter, not mask-reveal.
  // 仅在通过跨路由组遮罩揭示过渡到达时（如文档 → 首页）跳过入场动画。
  // 同路由组切换（如通过 BackLink 从留言板返回首页）虽有快照，但仍应播放
  // page-enter，而非 mask-reveal。
  const [skipEntry] = useState(() => {
    const snapshot = readTransitionSnapshot();
    if (!snapshot) return false;
    return isCrossRouteGroupTransition(snapshot.sourcePath, pathname);
  });

  const [restoreKey, setRestoreKey] = useState(0);
  const [isPageCacheRestore, setIsPageCacheRestore] = useState(false);
  const restoreFrameRef = useRef<number | null>(null);

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
      // Skip the initial frame only during a mask-reveal transition to avoid
      // the body background flashing through the transparent cutout area.
      // 仅在遮罩揭示过渡期间跳过首帧，避免 body 背景透过透明镂空区闪烁。
      className={`home-route-shell${
        skipEntry || isPageCacheRestore ? '' : ' home-route-shell--enter'
      }`}
    >
      {children}
    </div>
  );
}
