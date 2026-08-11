// Article back-to-top action: appears after the document title leaves the viewport
// and stays aligned with the article card's inline end.
// 文章返回顶部操作：文档标题离开视口后显示，并与正文卡片行尾对齐。
'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { prefersReducedMotion } from '@/lib/motion-preferences';

const CARD_SELECTOR = '[data-docs-page-card]';
const TITLE_SELECTOR = '[data-docs-title]';
const CONTROL_INSET_PX = 16;
const CONTROL_SIZE_PX = 40;

interface DocsBackToTopProps {
  label: string;
}

export function DocsBackToTop({ label }: DocsBackToTopProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [inlineEnd, setInlineEnd] = useState(CONTROL_INSET_PX);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const card = document.querySelector<HTMLElement>(CARD_SELECTOR);
    const title = document.querySelector<HTMLElement>(TITLE_SELECTOR);
    if (!card || !title) return;

    const syncInlineEnd = () => {
      const cardRight = Math.min(window.innerWidth, card.getBoundingClientRect().right);
      const spaceAfterCard = window.innerWidth - cardRight;
      const outsideInlineEnd = spaceAfterCard - CONTROL_SIZE_PX - CONTROL_INSET_PX;

      // Prefer the canvas beside the card; compact viewports fall back to an
      // inset position so the control always remains reachable.
      // 优先使用正文卡片外侧画布；紧凑视口回退到卡片内缩位置，确保按钮始终可达。
      setInlineEnd(
        outsideInlineEnd >= CONTROL_INSET_PX
          ? outsideInlineEnd
          : Math.max(CONTROL_INSET_PX, spaceAfterCard + CONTROL_INSET_PX),
      );
    };
    const titleObserver = new IntersectionObserver(([entry]) => {
      setIsVisible(!(entry?.isIntersecting ?? true));
    });
    const cardResizeObserver = new ResizeObserver(syncInlineEnd);

    setPortalRoot(document.body);
    syncInlineEnd();
    titleObserver.observe(title);
    cardResizeObserver.observe(card);
    window.addEventListener('resize', syncInlineEnd, { passive: true });

    return () => {
      titleObserver.disconnect();
      cardResizeObserver.disconnect();
      window.removeEventListener('resize', syncInlineEnd);
    };
  }, []);

  const handleClick = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  };

  if (!portalRoot) return null;

  return createPortal(
    <button
      aria-hidden={!isVisible}
      aria-label={label}
      className="docs-back-to-top"
      data-visible={isVisible ? '' : undefined}
      onClick={handleClick}
      style={{ insetInlineEnd: inlineEnd }}
      tabIndex={isVisible ? 0 : -1}
      title={label}
      type="button"
    >
      <ArrowUp aria-hidden="true" />
    </button>,
    portalRoot,
  );
}
