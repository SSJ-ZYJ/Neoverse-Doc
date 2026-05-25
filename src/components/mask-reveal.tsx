// Mask-reveal page transition: reads a DOM snapshot and click coordinates
// from sessionStorage (written by EnterDocsButton), then animates a
// radial-gradient clip-path from the click point outward — the inner circle
// reveals the target docs page while the outer area shows the snapshot overlay.
// 遮罩揭示页面过渡：从 sessionStorage 读取 DOM 快照与点击坐标（由 EnterDocsButton 写入），
// 然后从点击位置向外扩展 radial-gradient 裁剪动画——内圈揭示目标文档页，外圈展示快照遮罩。

'use client';

import { animate, motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export default function MaskReveal() {
  const [revealData, setRevealData] = useState<{ x: number; y: number; domHTML: string } | null>(
    () => {
      // Initialize synchronously on client navigation to avoid flicker
      // 客户端跳转时同步初始化，避免闪烁
      if (typeof window !== 'undefined') {
        const raw = sessionStorage.getItem('nd-docs-transition');
        if (raw) {
          try {
            const data = JSON.parse(raw);
            if (data.isTransitioning && Date.now() - data.ts < 3000) {
              return { x: data.x, y: data.y, domHTML: data.domHTML };
            }
          } catch {}
        }
      }
      return null;
    },
  );

  const radius = useMotionValue(0);
  const maskRef = useRef<HTMLDivElement>(null);

  // Clear the flag immediately after reading to prevent re-trigger on refresh or back navigation
  // 清除标志位，阅后即焚，避免刷新或后退后误触发
  useLayoutEffect(() => {
    sessionStorage.removeItem('nd-docs-transition');
  }, []);

  useEffect(() => {
    if (revealData) {
      // Calculate the maximum radius needed to cover the screen using the Pythagorean theorem
      // 勾股定理算出覆盖屏幕需要的最大半径
      const maxRadius =
        Math.max(
          window.innerWidth,
          window.innerHeight,
          Math.hypot(window.innerWidth, window.innerHeight),
        ) * 1.2; // Slightly enlarge to ensure corners are covered / 稍微扩大保障角落

      const controls = animate(radius, maxRadius, {
        duration: 0.8,
        ease: [0.76, 0.0, 0.24, 1.0], // Smooth expansion / 平滑扩大
        onComplete: () => {
          setRevealData(null);
        },
      });
      return controls.stop;
    }
  }, [revealData, radius]);

  // The soul of the reverse cutout: the transparent part (inner circle) makes the div transparent,
  // revealing the actual target document page underneath. The black part (outer) makes the div opaque,
  // showing the snapshot background of the main page!
  // 反向镂空的灵魂：transparent 部分（内部圈）会让所在 div【透明】，露出该 div 下方真正的目标文档页。
  // black 部分（外部）会让所在 div【不透明】，展示出该 div 的主版快照背景！
  const maskImage = useMotionTemplate`radial-gradient(circle at ${revealData?.x ?? 0}px ${revealData?.y ?? 0}px, transparent ${radius}px, black ${radius}px)`;

  // Set innerHTML via ref to avoid using dangerouslySetInnerHTML
  // 通过 ref 设置 innerHTML，避免使用 dangerouslySetInnerHTML
  useEffect(() => {
    if (maskRef.current && revealData) {
      maskRef.current.innerHTML = revealData.domHTML;
    }
  }, [revealData]);

  if (!revealData) return null;

  return (
    <motion.div
      id="nd-docs-transition-mask"
      // Apply bg-background to prevent cloned DOM with transparent areas from showing through
      // 指定 bg-background 防止克隆过来的 DOM 有透明底的区域穿帮
      className="fixed inset-0 z-[9999] pointer-events-none bg-background"
      ref={maskRef}
      style={{
        opacity: 1, // Must be absolutely opaque / 必须绝对不透明
        WebkitMaskImage: maskImage,
        maskImage,
      }}
    />
  );
}
