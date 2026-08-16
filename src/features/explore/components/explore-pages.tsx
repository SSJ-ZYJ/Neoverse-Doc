import { ArrowLeft, ArrowRight, BookOpen, Layers3, Tag } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Dictionary } from '@/dictionaries';
import { SearchTaxonomyAction } from '@/features/search';
import { TransitionLink } from '@/features/transition';
import { LANGUAGE_TAGS, type Locale } from '@/lib/i18n';

export interface ExploreTopicView {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly href: string;
  readonly contentCount: number;
}

export interface RelatedTopicView {
  readonly id: string;
  readonly label: string;
  readonly href: string;
}

export interface ExploreContentView {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly href: string;
  readonly actionLabel: string;
  readonly metadata: readonly {
    readonly label: string;
    readonly value: string;
    readonly variant: 'difficulty' | 'type';
  }[];
  readonly topics?: readonly RelatedTopicView[];
  readonly statusLabel?: string;
}

type TopicsCopy = Dictionary['topics'];
type ReferenceCopy = Dictionary['reference'];

export function ExplorePageShell({ children, locale }: { children: ReactNode; locale: Locale }) {
  return (
    <main className="knowledge-page explore-page" lang={LANGUAGE_TAGS[locale]}>
      <div className="knowledge-page__inner">{children}</div>
    </main>
  );
}

export function TopicsLandingPage({
  copy,
  topics,
}: {
  copy: TopicsCopy;
  topics: readonly ExploreTopicView[];
}) {
  return (
    <>
      <header className="page-header">
        <p className="page-header__eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className="page-header__description">{copy.description}</p>
      </header>

      {topics.length > 0 ? (
        <section aria-labelledby="explore-topics-heading" className="page-section">
          <div className="page-section__heading">
            <div>
              <p className="page-section__eyebrow">{copy.eyebrow}</p>
              <h2 id="explore-topics-heading">{copy.availableTopics}</h2>
            </div>
            <div aria-hidden="true" className="page-section__icon">
              <Layers3 size={24} />
            </div>
          </div>
          <div className="content-grid">
            {topics.map((topic) => (
              <TransitionLink
                className="explore-topic-card glass-card glass-interactive"
                data-card="true"
                data-nd-interaction="control"
                href={topic.href}
                key={topic.id}
              >
                <span className="explore-topic-card__topline">
                  <span className="explore-topic-card__icon" aria-hidden="true">
                    <Tag size={18} />
                  </span>
                  <ArrowRight aria-hidden="true" size={18} />
                </span>
                <span className="explore-topic-card__content">
                  <strong>{topic.label}</strong>
                  {topic.description && <span>{topic.description}</span>}
                </span>
                <span className="explore-topic-card__footer">
                  <span>
                    {topic.contentCount} {copy.contentCount}
                  </span>
                  <span>{copy.viewTopic}</span>
                </span>
              </TransitionLink>
            ))}
          </div>
        </section>
      ) : (
        <ExploreEmptyState title={copy.noTopicsTitle} description={copy.noTopicsDescription} />
      )}
    </>
  );
}

export function TopicPage({
  backHref,
  copy,
  description,
  entries,
  label,
  relatedTopics,
  searchQuery,
  searchTag,
}: {
  backHref: string;
  copy: TopicsCopy;
  description?: string;
  entries: readonly ExploreContentView[];
  label: string;
  relatedTopics: readonly RelatedTopicView[];
  searchQuery: string;
  searchTag: string;
}) {
  return (
    <>
      <header className="page-header page-header--detail">
        <TransitionLink className="page-header__back-link" href={backHref}>
          <ArrowLeft aria-hidden="true" size={16} />
          {copy.returnToTopics}
        </TransitionLink>
        <p className="page-header__eyebrow">{copy.eyebrow}</p>
        <h1>{label}</h1>
        {description && <p className="page-header__description">{description}</p>}
        <div className="page-header__actions">
          <SearchTaxonomyAction
            className="explore-search-action"
            label={copy.searchAction}
            query={searchQuery}
            tag={searchTag}
          />
        </div>
      </header>

      <section aria-labelledby="explore-topic-content-heading" className="page-section">
        <div className="page-section__heading">
          <div>
            <p className="page-section__eyebrow">{copy.eyebrow}</p>
            <h2 id="explore-topic-content-heading">{copy.relatedContent}</h2>
          </div>
          <div aria-hidden="true" className="page-section__icon">
            <BookOpen size={24} />
          </div>
        </div>
        {entries.length > 0 ? (
          <div className="explore-content-list">
            {entries.map((entry) => (
              <ExploreContentCard entry={entry} key={entry.id} />
            ))}
          </div>
        ) : (
          <ExploreEmptyState title={copy.noContentTitle} description={copy.noContentDescription} />
        )}
      </section>

      {relatedTopics.length > 0 && (
        <section
          aria-labelledby="explore-related-topics-heading"
          className="page-section page-section--secondary"
        >
          <div className="page-section__heading">
            <div>
              <p className="page-section__eyebrow">{copy.eyebrow}</p>
              <h2 id="explore-related-topics-heading">{copy.relatedTopics}</h2>
            </div>
            <div aria-hidden="true" className="page-section__icon">
              <Layers3 size={24} />
            </div>
          </div>
          <div className="explore-related__links">
            {relatedTopics.map((topic) => (
              <TransitionLink
                className="explore-related__link glass-card glass-interactive"
                href={topic.href}
                key={topic.id}
              >
                <Tag aria-hidden="true" size={16} />
                <span>{topic.label}</span>
                <ArrowRight aria-hidden="true" size={16} />
              </TransitionLink>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export function ReferencePage({
  copy,
  description,
  entries,
  referenceTitle,
  searchTag,
}: {
  copy: ReferenceCopy;
  description?: string;
  entries: readonly ExploreContentView[];
  referenceTitle: string;
  searchTag: string;
}) {
  return (
    <>
      <header className="page-header">
        <p className="page-header__eyebrow">{copy.eyebrow}</p>
        <h1>{referenceTitle}</h1>
        {description && <p className="page-header__description">{description}</p>}
        <div className="page-header__actions">
          <SearchTaxonomyAction
            className="explore-search-action"
            label={copy.searchAction}
            tag={searchTag}
          />
        </div>
      </header>

      <section aria-labelledby="reference-content-heading" className="page-section">
        <div className="page-section__heading">
          <div>
            <p className="page-section__eyebrow">{copy.eyebrow}</p>
            <h2 id="reference-content-heading">{copy.availableContent}</h2>
          </div>
          <div aria-hidden="true" className="page-section__icon">
            <BookOpen size={24} />
          </div>
        </div>
        {entries.length > 0 ? (
          <div className="explore-content-list">
            {entries.map((entry) => (
              <ExploreContentCard entry={entry} key={entry.id} showTopics />
            ))}
          </div>
        ) : (
          <ExploreEmptyState title={copy.noContentTitle} description={copy.noContentDescription} />
        )}
      </section>
    </>
  );
}

function ExploreContentCard({
  entry,
  showTopics = false,
}: {
  entry: ExploreContentView;
  showTopics?: boolean;
}) {
  return (
    <article className="explore-content-card glass-card" data-card="true">
      <div className="explore-content-card__heading">
        <TransitionLink href={entry.href}>
          <h3>{entry.title}</h3>
        </TransitionLink>
        {entry.statusLabel && (
          <span className="metadata-chip metadata-chip--status">{entry.statusLabel}</span>
        )}
      </div>
      {entry.description && (
        <p className="explore-content-card__description">{entry.description}</p>
      )}
      {entry.metadata.length > 0 && (
        <dl className="explore-content-card__metadata">
          {entry.metadata.map((item) => (
            <div
              className={`metadata-chip metadata-chip--${item.variant} metadata-chip--labeled`}
              key={`${item.label}:${item.value}`}
            >
              <dt className="metadata-chip__label">{item.label}</dt>
              <dd className="metadata-chip__value">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {showTopics && entry.topics && entry.topics.length > 0 && (
        <div className="explore-content-card__topics">
          {entry.topics.map((topic) => (
            <TransitionLink
              className="metadata-chip metadata-chip--topic metadata-chip--interactive"
              href={topic.href}
              key={topic.id}
            >
              <Tag aria-hidden="true" size={13} />
              {topic.label}
            </TransitionLink>
          ))}
        </div>
      )}
      <TransitionLink className="explore-content-card__action" href={entry.href}>
        <span>{entry.actionLabel}</span>
        <ArrowRight aria-hidden="true" size={16} />
      </TransitionLink>
    </article>
  );
}

function ExploreEmptyState({ description, title }: { description: string; title: string }) {
  return (
    <div className="empty-state glass-card" data-card="true">
      <div aria-hidden="true" className="empty-state__icon">
        <Layers3 size={24} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
