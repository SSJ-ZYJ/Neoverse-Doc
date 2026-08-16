import { ArrowRight, BookOpen, CalendarDays, Clock3, GitBranch } from 'lucide-react';
import type { ContentManifestEntry } from '@/content/generated/manifest';
import {
  contentProjectionSources,
  getKnowledgeManifestEntry,
  type DocumentKnowledgeProjection,
} from '@/content/projections';
import {
  CONTENT_DIFFICULTY_REGISTRY,
  CONTENT_TOPIC_REGISTRY,
  CONTENT_TRACK_REGISTRY,
  CONTENT_TYPE_REGISTRY,
} from '@/content/taxonomy';
import type { TaxonomyEntry } from '@/content/taxonomy';
import type { Dictionary } from '@/dictionaries';
import { TransitionLink } from '@/features/transition';
import type { Locale } from '@/lib/i18n';
import type { ReactNode } from 'react';

export type DocsKnowledgeCopy = Dictionary['knowledgeContext'];

interface DocsKnowledgeContextProps {
  copy: DocsKnowledgeCopy;
  entry: ContentManifestEntry;
  locale: Locale;
  projection: DocumentKnowledgeProjection;
}

function getTaxonomyLabel(
  registry: readonly TaxonomyEntry[],
  id: string,
  locale: Locale,
): string | undefined {
  return registry.find((entry) => entry.id === id)?.label[locale];
}

function getTaxonomyLabels(
  registry: readonly TaxonomyEntry[],
  ids: readonly string[] | undefined,
  locale: Locale,
): readonly string[] {
  if (!ids || ids.length === 0) return [];

  const selected = new Set(ids);
  return [...registry]
    .filter((entry) => selected.has(entry.id))
    .sort((left, right) => left.order - right.order)
    .map((entry) => entry.label[locale]);
}

function resolveRelationEntry(
  contentId: string | undefined,
  locale: Locale,
): ContentManifestEntry | undefined {
  return contentId
    ? getKnowledgeManifestEntry(contentProjectionSources, contentId, locale)
    : undefined;
}

function hasKnowledgeMetadata(
  entry: ContentManifestEntry,
  projection: DocumentKnowledgeProjection,
): boolean {
  return Boolean(
    entry.type ||
      entry.topics?.length ||
      entry.tracks?.length ||
      entry.difficulty ||
      entry.estimatedMinutes ||
      entry.lastReviewed ||
      entry.status !== 'stable' ||
      projection.prerequisiteIds.length,
  );
}

function MetadataValue({ children }: { children: ReactNode }) {
  return <div className="docs-knowledge-context__values">{children}</div>;
}

export function DocsKnowledgeContext({
  copy,
  entry,
  locale,
  projection,
}: DocsKnowledgeContextProps) {
  if (!hasKnowledgeMetadata(entry, projection)) return null;

  const typeLabel = entry.type
    ? getTaxonomyLabel(CONTENT_TYPE_REGISTRY, entry.type, locale)
    : undefined;
  const topicLabels = getTaxonomyLabels(CONTENT_TOPIC_REGISTRY, entry.topics, locale);
  const trackLabels = getTaxonomyLabels(CONTENT_TRACK_REGISTRY, entry.tracks, locale);
  const difficultyLabel = entry.difficulty
    ? getTaxonomyLabel(CONTENT_DIFFICULTY_REGISTRY, entry.difficulty, locale)
    : undefined;

  return (
    <section
      aria-labelledby="docs-knowledge-context-title"
      className="docs-knowledge-context"
      data-docs-knowledge-context=""
    >
      <div className="docs-knowledge-context__heading">
        <BookOpen aria-hidden="true" size={18} />
        <h2 id="docs-knowledge-context-title">{copy.title}</h2>
      </div>
      <dl className="docs-knowledge-context__metadata">
        {typeLabel && (
          <div className="docs-knowledge-context__metadata-item">
            <dt>{copy.type}</dt>
            <dd>
              <MetadataValue>
                <span className="metadata-chip metadata-chip--type">{typeLabel}</span>
              </MetadataValue>
            </dd>
          </div>
        )}
        {topicLabels.length > 0 && (
          <div className="docs-knowledge-context__metadata-item">
            <dt>{copy.topics}</dt>
            <dd>
              <MetadataValue>
                {topicLabels.map((label) => (
                  <span className="metadata-chip metadata-chip--topic" key={label}>
                    {label}
                  </span>
                ))}
              </MetadataValue>
            </dd>
          </div>
        )}
        {trackLabels.length > 0 && (
          <div className="docs-knowledge-context__metadata-item">
            <dt>{copy.track}</dt>
            <dd>
              <MetadataValue>
                {trackLabels.map((label) => (
                  <span className="metadata-chip metadata-chip--track" key={label}>
                    {label}
                  </span>
                ))}
              </MetadataValue>
            </dd>
          </div>
        )}
        {difficultyLabel && (
          <div className="docs-knowledge-context__metadata-item">
            <dt>{copy.difficulty}</dt>
            <dd>
              <MetadataValue>
                <span className="metadata-chip metadata-chip--difficulty">{difficultyLabel}</span>
              </MetadataValue>
            </dd>
          </div>
        )}
        {entry.estimatedMinutes !== undefined && (
          <div className="docs-knowledge-context__metadata-item">
            <dt>{copy.estimatedReadingTime}</dt>
            <dd>
              <MetadataValue>
                <span className="metadata-chip">
                  <Clock3 aria-hidden="true" size={14} />
                  {entry.estimatedMinutes} {copy.minutes}
                </span>
              </MetadataValue>
            </dd>
          </div>
        )}
        <div className="docs-knowledge-context__metadata-item">
          <dt>{copy.contentStatus}</dt>
          <dd>
            <MetadataValue>
              <span className="metadata-chip metadata-chip--status">
                {copy.status[entry.status]}
              </span>
            </MetadataValue>
          </dd>
        </div>
        {entry.lastReviewed && (
          <div className="docs-knowledge-context__metadata-item">
            <dt>{copy.lastReviewed}</dt>
            <dd>
              <MetadataValue>
                <span className="metadata-chip">
                  <CalendarDays aria-hidden="true" size={14} />
                  {entry.lastReviewed}
                </span>
              </MetadataValue>
            </dd>
          </div>
        )}
      </dl>

      {projection.prerequisiteIds.length > 0 && (
        <div className="docs-knowledge-context__relations">
          <h3>
            <GitBranch aria-hidden="true" size={16} />
            {copy.prerequisites}
          </h3>
          <ul>
            {projection.prerequisiteIds.map((contentId) => {
              const prerequisite = resolveRelationEntry(contentId, locale);
              if (!prerequisite) return null;

              return (
                <li key={contentId}>
                  <TransitionLink href={prerequisite.url}>{prerequisite.title}</TransitionLink>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

export function DocsKnowledgeRelations({
  copy,
  locale,
  projection,
}: Omit<DocsKnowledgeContextProps, 'entry'>) {
  const recommended = resolveRelationEntry(projection.recommendedNextId, locale);
  const related = projection.relatedIds.flatMap((contentId) => {
    const entry = resolveRelationEntry(contentId, locale);
    return entry ? [entry] : [];
  });

  if (!recommended && related.length === 0) return null;

  return (
    <>
      {recommended && (
        <section
          aria-labelledby="docs-knowledge-next-title"
          className="docs-knowledge-relations docs-knowledge-relations--next"
        >
          <div className="docs-knowledge-relations__heading">
            <ArrowRight aria-hidden="true" size={18} />
            <h2 id="docs-knowledge-next-title">{copy.recommendedNext}</h2>
          </div>
          <RelationList entries={[recommended]} />
        </section>
      )}
      {related.length > 0 && (
        <section
          aria-labelledby="docs-knowledge-related-title"
          className="docs-knowledge-relations"
        >
          <div className="docs-knowledge-relations__heading">
            <BookOpen aria-hidden="true" size={18} />
            <h2 id="docs-knowledge-related-title">{copy.relatedContent}</h2>
          </div>
          <RelationList entries={related} />
        </section>
      )}
    </>
  );
}

function RelationList({ entries }: { entries: readonly ContentManifestEntry[] }) {
  return (
    <ul className="docs-knowledge-relations__list">
      {entries.map((entry) => (
        <li key={entry.id}>
          <TransitionLink href={entry.url}>
            <span>{entry.title}</span>
            <ArrowRight aria-hidden="true" size={16} />
          </TransitionLink>
        </li>
      ))}
    </ul>
  );
}
