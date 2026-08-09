'use client';

// Keeps the viewport-edge blur aligned with the server-rendered document card.
// IntersectionObserver handles visibility at the card/footer boundaries while
// ResizeObserver updates geometry only when layout dimensions actually change.
// 让视口边缘模糊与服务端渲染的正文卡片对齐；IntersectionObserver 负责卡片与
// 页脚边界的可见性，ResizeObserver 仅在布局尺寸真正变化时更新几何信息。

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GradualBlur } from '@/components/react-bits/gradual-blur';

const CARD_SELECTOR = '[data-docs-page-card]';
const FOOTER_SELECTOR = '[data-docs-page-footer]';

interface OverlayMetrics {
  left: number;
  width: number;
}

const EMPTY_METRICS: OverlayMetrics = { left: 0, width: 0 };

export function DocsPageGradualBlur() {
  const [metrics, setMetrics] = useState<OverlayMetrics>(EMPTY_METRICS);
  const [isVisible, setIsVisible] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const card = document.querySelector<HTMLElement>(CARD_SELECTOR);
    const footer = document.querySelector<HTMLElement>(FOOTER_SELECTOR);
    if (!card || !footer) return;

    let cardIsVisible = false;
    let footerIsVisible = true;

    const syncVisibility = () => {
      setIsVisible(cardIsVisible && !footerIsVisible);
    };
    const syncMetrics = () => {
      const rect = card.getBoundingClientRect();
      const left = Math.max(0, rect.left);
      const right = Math.min(window.innerWidth, rect.right);
      const nextMetrics = { left, width: Math.max(0, right - left) };

      setMetrics((current) =>
        Math.abs(current.left - nextMetrics.left) < 0.5 &&
        Math.abs(current.width - nextMetrics.width) < 0.5
          ? current
          : nextMetrics,
      );
    };

    const cardObserver = new IntersectionObserver(([entry]) => {
      cardIsVisible = entry?.isIntersecting ?? false;
      syncVisibility();
    });
    const footerObserver = new IntersectionObserver(([entry]) => {
      footerIsVisible = entry?.isIntersecting ?? true;
      syncVisibility();
    });
    const resizeObserver = new ResizeObserver(syncMetrics);

    setPortalRoot(document.body);
    syncMetrics();
    cardObserver.observe(card);
    footerObserver.observe(footer);
    resizeObserver.observe(card);
    window.addEventListener('resize', syncMetrics, { passive: true });

    return () => {
      cardObserver.disconnect();
      footerObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncMetrics);
    };
  }, []);

  if (!portalRoot || metrics.width === 0) return null;

  return createPortal(
    <GradualBlur
      className="docs-page-gradual-blur"
      curve="bezier"
      data-visible={isVisible ? '' : undefined}
      divCount={3}
      height="4rem"
      opacity={0.9}
      strength={1.25}
      style={{ left: metrics.left, width: metrics.width }}
    />,
    portalRoot,
  );
}
