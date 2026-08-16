// Primary homepage entries expose the product projections as the first
// navigation choice instead of making the authoring Chapter tree the default.
// 首页主入口直接呈现产品投影，让用户先选择目标，而不是先面对作者编排的章节树。

import { ArrowUpRight, BookOpen, Compass, Search } from 'lucide-react';
import { TransitionLink } from '@/features/transition';

export type HomeKnowledgeEntryId = 'learn' | 'topics' | 'reference';

export interface HomeKnowledgeEntry {
  readonly description: string;
  readonly href: string;
  readonly id: HomeKnowledgeEntryId;
  readonly meta: string;
  readonly title: string;
}

function EntryIcon({ id }: { id: HomeKnowledgeEntryId }) {
  if (id === 'learn') return <BookOpen aria-hidden="true" size={21} />;
  if (id === 'topics') return <Compass aria-hidden="true" size={21} />;
  return <Search aria-hidden="true" size={21} />;
}

export function HomeEntryGrid({ entries }: { entries: readonly HomeKnowledgeEntry[] }) {
  return (
    <div className="home-entry-grid">
      {entries.map((entry) => (
        <TransitionLink
          className="home-entry-card surface-panel glass-interactive"
          data-nd-interaction="control"
          href={entry.href}
          key={entry.id}
          transition="surface"
        >
          <span className="home-entry-card__topline">
            <span className="home-entry-card__icon">
              <EntryIcon id={entry.id} />
            </span>
            <ArrowUpRight aria-hidden="true" className="home-entry-card__arrow" size={18} />
          </span>
          <span className="home-entry-card__content">
            <strong>{entry.title}</strong>
            <span>{entry.description}</span>
          </span>
          <span className="home-entry-card__meta">{entry.meta}</span>
        </TransitionLink>
      ))}
    </div>
  );
}
