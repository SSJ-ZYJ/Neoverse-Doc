'use client';

import { animate, motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export default function MaskReveal() {
  const [revealData, setRevealData] = useState<{ x: number; y: number; domHTML: string } | null>(
    () => {
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

  // 清除标志位，阅后即焚，避免刷新或后退后误触发
  useLayoutEffect(() => {
    sessionStorage.removeItem('nd-docs-transition');
  }, []);

  useEffect(() => {
    if (revealData) {
      // 勾股定理算出覆盖屏幕需要的最大半径
      const maxRadius =
        Math.max(
          window.innerWidth,
          window.innerHeight,
          Math.hypot(window.innerWidth, window.innerHeight),
        ) * 1.2; // 稍微扩大保障角落

      const controls = animate(radius, maxRadius, {
        duration: 0.8,
        ease: [0.76, 0.0, 0.24, 1.0], // 平滑扩大
        onComplete: () => {
          setRevealData(null);
        },
      });
      return controls.stop;
    }
  }, [revealData, radius]);

  // 反向镂空的灵魂：transparent 部分（内部圈）会让所在 div【透明】，露出该 div 下方真正的目标文档页。
  // black 部分（外部）会让所在 div【不透明】，展示出该 div 的主版快照背景！
  const maskImage = useMotionTemplate`radial-gradient(circle at ${revealData?.x ?? 0}px ${revealData?.y ?? 0}px, transparent ${radius}px, black ${radius}px)`;

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
      // 指定 bg-background 防止克隆过来的 DOM 有透明底的区域穿帮
      className="fixed inset-0 z-[9999] pointer-events-none bg-background"
      ref={maskRef}
      style={{
        opacity: 1, // 必须绝对不透明
        WebkitMaskImage: maskImage,
        maskImage,
      }}
    />
  );
}
