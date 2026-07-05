// Mask-reveal page transition: reads a DOM snapshot and click coordinates
// from sessionStorage (written by EnterDocsButton), then animates a
// radial-gradient clip-path from the click point outward — the inner circle
// reveals the target docs page while the outer area shows the snapshot overlay.
// 遮罩揭示页面过渡：从 sessionStorage 读取 DOM 快照与点击坐标（由 EnterDocsButton 写入），
// 然后从点击位置向外扩展 radial-gradient 裁剪动画——内圈揭示目标文档页，外圈展示快照遮罩。

'use client';

import { animate, motion, useMotionTemplate, useMotionValue, useTransform } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { maskRevealTransition } from '@/lib/motion';
import {
  captureTransitionSnapshotAtPoint,
  clearTransitionSnapshot,
  isCrossRouteGroupTransition,
  readTransitionSnapshot,
  removeTransitionHoldOverlay,
  type TransitionSnapshotData,
} from '@/lib/transition-snapshot';

function normalizePathname(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '');
  return normalized.length > 0 ? normalized : '/';
}

export default function MaskReveal() {
  const pathname = usePathname();
  const routeSnapshotKey = normalizePathname(pathname);

  // Track the last-processed routeSnapshotKey to avoid double-processing in
  // React Strict Mode (dev), where useLayoutEffect runs twice on mount.
  // Without this, the first run reads & clears the snapshot, and the second
  // run reads null — overwriting revealData with null and cancelling the
  // animation before it starts.
  // 跟踪上次处理的 routeSnapshotKey，避免 React Strict Mode（开发模式）下
  // useLayoutEffect 运行两次导致的问题：第一次读取并清除快照，第二次读到 null，
  // 把 revealData 覆盖为 null，动画还没开始就被取消。
  const lastProcessedKeyRef = useRef<string | null>(null);

  // Initialize synchronously on client navigation to avoid flicker.
  // Only reveal for cross-route-group transitions; within-group snapshots
  // (e.g. guestbook → home) are ignored so page-enter can play instead.
  // 客户端跳转时同步初始化，避免闪烁。
  // 仅对跨路由组切换进行揭示；同组快照（如留言板 → 首页）被忽略，
  // 以便播放 page-enter 动画。
  const [revealData, setRevealData] = useState<TransitionSnapshotData | null>(() => {
    const snapshot = readTransitionSnapshot();
    if (!snapshot) return null;
    return isCrossRouteGroupTransition(snapshot.sourcePath, window.location.pathname)
      ? snapshot
      : null;
  });

  const radius = useMotionValue(0);
  const feather = useMotionValue(40);
  const maskRef = useRef<HTMLDivElement>(null);

  // Consume snapshots on every path change because this component is mounted
  // above the home/docs route groups and therefore persists between them.
  // Only play mask-reveal for cross-route-group transitions; within-group
  // transitions (e.g., guestbook → home) should use page-enter instead.
  // 组件挂在 home/docs 路由组之上，组间切换不会重新挂载；因此每次路径变化都读取快照。
  // 仅对跨路由组切换播放 mask-reveal；同组切换（如留言板 → 首页）应使用 page-enter。
  useLayoutEffect(() => {
    // Skip if we've already processed this routeSnapshotKey (React Strict Mode
    // double-invocation in dev). The first invocation already consumed the
    // snapshot and set revealData; the second must not overwrite it with null.
    // 跳过已处理过的 routeSnapshotKey（React Strict Mode 开发模式双重调用）。
    // 第一次调用已消费快照并设置 revealData；第二次不得用 null 覆盖。
    if (lastProcessedKeyRef.current === routeSnapshotKey) return;
    lastProcessedKeyRef.current = routeSnapshotKey;

    const snapshot = routeSnapshotKey ? readTransitionSnapshot() : null;
    // Within-group transitions (e.g., guestbook → home via BackLink) should
    // not play mask-reveal — just clean up the hold overlay and let the
    // destination's page-enter animation handle the transition.
    // 同路由组切换（如通过 BackLink 从留言板返回首页）不应播放 mask-reveal ——
    // 直接清理 hold overlay，让目标页的 page-enter 动画处理过渡。
    const shouldReveal =
      snapshot !== null &&
      isCrossRouteGroupTransition(snapshot.sourcePath, window.location.pathname);
    setRevealData(shouldReveal ? snapshot : null);
    clearTransitionSnapshot();

    if (!shouldReveal) {
      removeTransitionHoldOverlay();
    }
  }, [routeSnapshotKey]);

  // Capture fumadocs-generated links (e.g. navbar guestbook link) before
  // Next.js swaps route groups, then place an immediate snapshot overlay to
  // cover the occasional blank frame.
  // Skip elements marked with [data-nd-transition-capture] — they have their
  // own capture logic (EnterDocsButton / BackLink / NavTitle) and would
  // otherwise be double-captured, causing the hold overlay to mount before
  // the custom handler can apply visual feedback (e.g. button scale).
  // 在 Next.js 切换路由组前捕获 fumadocs 生成的链接（如导航栏留言板链接），
  // 并立即铺上快照遮罩兜住偶发白屏帧。
  // 跳过带 [data-nd-transition-capture] 标记的元素 —— 它们有自己的捕获逻辑
  // （EnterDocsButton / BackLink / NavTitle），否则会被双重捕获，导致遮罩在
  // 自定义处理器应用视觉反馈（如按钮缩放）之前就挂载。
  useEffect(() => {
    const handleRouteIntent = (event: Event) => {
      if (!(event instanceof MouseEvent)) return;

      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target instanceof Element ? event.target : null;
      // Skip custom components that handle their own snapshot capture.
      // 跳过自身处理快照捕获的自定义组件。
      if (target?.closest('[data-nd-transition-capture]')) return;

      const anchor = target?.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement) || anchor.download) return;
      if (anchor.target && anchor.target !== '_self') return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (!isCrossRouteGroupTransition(window.location.pathname, url.pathname)) return;

      const rect = anchor.getBoundingClientRect();
      const x = event.clientX || rect.left + rect.width / 2;
      const y = event.clientY || rect.top + rect.height / 2;
      captureTransitionSnapshotAtPoint(x, y);
    };

    // Only listen for click — pointerdown would mount the hold overlay before
    // the click completes, hiding button active/press feedback from the user.
    // 仅监听 click —— pointerdown 会在点击完成前挂载遮罩，隐藏按钮的
    // 活动态 / 按压反馈。
    document.addEventListener('click', handleRouteIntent, { capture: true });

    return () => {
      document.removeEventListener('click', handleRouteIntent, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (!revealData) return;

    // Reset MotionValues to their initial states before starting a new
    // animation. Without this, after the first reveal completes radius
    // stays at maxRadius and feather stays at maxRadius*0.35; the next
    // animate(radius, maxRadius, ...) would have start === end and produce
    // no visible motion (regression: "clicking guestbook from docs has no
    // animation at all").
    // 每次新动画前将 MotionValue 重置为初始值。否则首次动画结束后 radius
    // 保持在 maxRadius、feather 保持在 maxRadius*0.35，再次
    // animate(radius, maxRadius, ...) 起点等于终点，无任何动画效果
    // （回归："文档页点击留言板彻底没动画了"）。
    radius.set(0);
    feather.set(40);

    // Calculate the maximum radius needed to cover the screen (Pythagorean theorem).
    // 勾股定理算出覆盖屏幕需要的最大半径。
    const maxRadius =
      Math.max(
        window.innerWidth,
        window.innerHeight,
        Math.hypot(window.innerWidth, window.innerHeight),
      ) * 1.2; // Slightly enlarge to ensure corners are covered / 稍微扩大保障角落

    const controls = animate(radius, maxRadius, {
      ...maskRevealTransition,
      onComplete: () => {
        setRevealData(null);
        removeTransitionHoldOverlay();
      },
    });

    // Feather animation: gradually increase feather size for softer edge reveal.
    // 羽化动画：逐渐增大羽化尺寸，使边缘揭示更柔和。
    const featherControls = animate(feather, maxRadius * 0.35, {
      duration: maskRevealTransition.duration,
      ease: maskRevealTransition.ease,
    });

    return () => {
      controls.stop();
      featherControls.stop();
    };
  }, [revealData, radius, feather]);

  // The soul of the reverse cutout: the transparent part (inner circle) makes
  // the div transparent, revealing the actual target document page underneath.
  // The black part (outer) makes the div opaque, showing the snapshot background.
  // 反向镂空的灵魂：transparent 部分（内圈）让 div 透明，露出下方真正的目标文档页；
  // black 部分（外圈）让 div 不透明，展示主版快照背景。
  const featheredEdge = useTransform([radius, feather], ([r, f]) => Number(r) + Number(f));
  const maskImage = useMotionTemplate`radial-gradient(circle at ${revealData?.x ?? 0}px ${revealData?.y ?? 0}px, transparent ${radius}px, black ${featheredEdge}px)`;

  // Set innerHTML via ref to avoid dangerouslySetInnerHTML.
  // Must run in useLayoutEffect (synchronous before paint) — if deferred to
  // useEffect, the first frame would render an empty mask, briefly exposing
  // the underlying docs page at scrollTop=0 before the snapshot covers it.
  // When the user had scrolled the homepage at click time, wrap the snapshot
  // in a translateY(-scrollY) shell so it renders at the exact viewport offset.
  // 通过 ref 设置 innerHTML，避免使用 dangerouslySetInnerHTML。
  // 必须放在 useLayoutEffect（绘制前同步执行）— 若放在 useEffect，首帧会渲染出
  // 空的遮罩，让下方已滚动到顶部的文档页面短暂裸露，再被快照覆盖。
  // 若点击时用户已滚动首页，用 translateY(-scrollY) 外壳包裹快照，使其按
  // 用户当时实际看到的视口偏移渲染。
  useLayoutEffect(() => {
    if (maskRef.current && revealData) {
      maskRef.current.innerHTML =
        revealData.scrollY > 0
          ? `<div style="transform:translateY(${-revealData.scrollY}px);will-change:transform;">${revealData.domHTML}</div>`
          : revealData.domHTML;
      removeTransitionHoldOverlay();
    }
  }, [revealData]);

  if (!revealData) return null;

  return (
    <motion.div
      id="nd-docs-transition-mask"
      // bg-background prevents cloned DOM with transparent areas from showing through.
      // 指定 bg-background 防止克隆过来的 DOM 有透明底区域穿帮。
      className="fixed inset-0 z-[9999] pointer-events-none bg-background"
      ref={maskRef}
      style={{
        opacity: 1, // Must be absolutely opaque / 必须绝对不透明
        willChange: 'mask-image, -webkit-mask-image',
        WebkitMaskImage: maskImage,
        maskImage,
      }}
    />
  );
}
