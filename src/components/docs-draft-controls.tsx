// Minimal client island for unlocking an already-rendered draft document.
// It changes explicit DOM state in place and never owns the MDX render tree.
// 用于解锁已渲染草稿文档的最小客户端岛；仅原地切换显式 DOM 状态，
// 不接管 MDX 渲染树。

'use client';

import { ArrowLeft, Eye } from 'lucide-react';
import type { MouseEvent } from 'react';
import { TransitionLink } from '@/features/transition/transition-link';

interface DocsDraftControlsProps {
  badge: string;
  description: string;
  previousHref: string;
  previousLabel: string;
  revealAction: string;
  title: string;
  unlockedAnnouncement: string;
}

export function DocsDraftControls({
  badge,
  description,
  previousHref,
  previousLabel,
  revealAction,
  title,
  unlockedAnnouncement,
}: DocsDraftControlsProps) {
  const unlockDraft = (event: MouseEvent<HTMLButtonElement>) => {
    const gate = event.currentTarget.closest<HTMLElement>('[data-docs-draft]');
    if (!gate) return;

    const content = gate.querySelector<HTMLElement>('.docs-draft__content');
    const body = content?.querySelector<HTMLElement>('[data-docs-body]');
    const announcement = gate.querySelector<HTMLElement>('[data-docs-draft-announcement]');

    content?.removeAttribute('aria-hidden');
    content?.removeAttribute('inert');
    gate.dataset.state = 'unlocked';
    if (announcement) announcement.textContent = unlockedAnnouncement;

    // Focus after the data-state styles have exposed the full article.
    // 等待 data-state 样式恢复完整正文后再移动焦点。
    window.requestAnimationFrame(() => body?.focus({ preventScroll: true }));
  };

  return (
    <>
      <section className="docs-draft__notice" aria-labelledby="docs-draft-title">
        <span className="docs-draft__badge">{badge}</span>
        <span className="docs-draft__illustration" aria-hidden="true">
          🚧
        </span>
        <div className="docs-draft__copy">
          <h2 className="docs-draft__title" id="docs-draft-title">
            {title}
          </h2>
          <p className="docs-draft__description">{description}</p>
        </div>
        <div className="docs-draft__actions">
          <TransitionLink
            className="control-surface docs-draft__action docs-draft__action--previous"
            data-nd-interaction="control"
            href={previousHref}
          >
            <ArrowLeft aria-hidden="true" size={18} />
            {previousLabel}
          </TransitionLink>
          <button
            className="control-surface docs-draft__action docs-draft__action--reveal cursor-pointer"
            onClick={unlockDraft}
            type="button"
          >
            <Eye aria-hidden="true" size={18} />
            {revealAction}
          </button>
        </div>
      </section>
      <span className="sr-only" aria-live="polite" data-docs-draft-announcement="" />
    </>
  );
}
