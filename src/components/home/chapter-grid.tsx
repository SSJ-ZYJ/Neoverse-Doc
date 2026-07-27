// Business chapter grid backed by the restrained Magic Bento implementation.
// 使用克制版 Magic Bento 实现的业务章节网格。

import { ArrowUpRight } from 'lucide-react';
import { MagicBento } from '@/components/react-bits/magic-bento';
import { TransitionLink } from '@/components/transition/transition-link';
import type { HomeChapter } from '@/lib/home-sections';

interface ChapterGridProps {
  actionLabel: string;
  chapters: HomeChapter[];
}

export function ChapterGrid({ actionLabel, chapters }: ChapterGridProps) {
  return (
    <MagicBento className="chapter-grid">
      {chapters.map((chapter, index) => (
        <TransitionLink
          className="chapter-card"
          data-bento-card
          href={chapter.href}
          key={chapter.href}
        >
          <span className="chapter-card__index">{String(index + 1).padStart(2, '0')}</span>
          <span className="chapter-card__content">
            <strong>{chapter.title}</strong>
            {chapter.description && <span>{chapter.description}</span>}
          </span>
          <span className="chapter-card__action">
            {actionLabel}
            <ArrowUpRight aria-hidden="true" size={16} />
          </span>
        </TransitionLink>
      ))}
    </MagicBento>
  );
}
