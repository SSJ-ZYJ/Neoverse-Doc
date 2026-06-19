// Mask-reveal page transition: reads a DOM snapshot and click coordinates
// from sessionStorage (written by EnterDocsButton), then animates a
// radial-gradient clip-path from the click point outward — the inner circle
// reveals the target docs page while the outer area shows the snapshot overlay.
// 遮罩揭示页面过渡：从 sessionStorage 读取 DOM 快照与点击坐标（由 EnterDocsButton 写入），
// 然后从点击位置向外扩展 radial-gradient 裁剪动画——内圈揭示目标文档页，外圈展示快照遮罩。

'use client';

import { animate, motion, useMotionTemplate, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { maskRevealTransition } from '@/lib/motion';
import {
  clearTransitionSnapshot,
  readTransitionSnapshot,
  type TransitionSnapshotData,
} from '@/lib/transition-snapshot';

export default function MaskReveal() {
  // Initialize synchronously on client navigation to avoid flicker.
  // 客户端跳转时同步初始化，避免闪烁。
  const [revealData, setRevealData] = useState<TransitionSnapshotData | null>(() =>
    readTransitionSnapshot(),
  );

  const radius = useMotionValue(0);
  const feather = useMotionValue(40);
  const maskRef = useRef<HTMLDivElement>(null);

  // Clear the flag immediately after reading (read-once semantics).
  // 阅后即焚：读取后立即清除标志位。
  useLayoutEffect(() => {
    clearTransitionSnapshot();
  }, []);

  useEffect(() => {
    if (!revealData) return;

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
      onComplete: () => setRevealData(null),
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
