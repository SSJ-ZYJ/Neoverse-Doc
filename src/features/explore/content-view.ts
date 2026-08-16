import type { ContentManifestEntry } from '@/content/generated/manifest';
import {
  CONTENT_DIFFICULTY_REGISTRY,
  CONTENT_TOPIC_REGISTRY,
  CONTENT_TYPE_REGISTRY,
} from '@/content/taxonomy';
import type { Locale } from '@/lib/i18n';
import type { ExploreContentView, RelatedTopicView } from './components/explore-pages';

export interface ExploreContentLabels {
  readonly actionLabel: string;
  readonly contentType: string;
  readonly difficulty: string;
  readonly reviewBadge: string;
}

export function createExploreContentView(
  entry: ContentManifestEntry,
  locale: Locale,
  labels: ExploreContentLabels,
): ExploreContentView {
  const metadata: {
    label: string;
    value: string;
    variant: 'difficulty' | 'type';
  }[] = [];
  if (entry.type !== undefined) {
    const type = CONTENT_TYPE_REGISTRY.find((candidate) => candidate.id === entry.type);
    if (type) {
      metadata.push({ label: labels.contentType, value: type.label[locale], variant: 'type' });
    }
  }
  if (entry.difficulty !== undefined) {
    const difficulty = CONTENT_DIFFICULTY_REGISTRY.find(
      (candidate) => candidate.id === entry.difficulty,
    );
    if (difficulty) {
      metadata.push({
        label: labels.difficulty,
        value: difficulty.label[locale],
        variant: 'difficulty',
      });
    }
  }

  return {
    id: entry.id,
    title: entry.title,
    ...(entry.description !== undefined ? { description: entry.description } : {}),
    href: entry.url,
    actionLabel: labels.actionLabel,
    metadata,
    ...(entry.topics !== undefined
      ? { topics: createExploreTopicLinks(entry.topics, locale) }
      : {}),
    ...(entry.status === 'review' ? { statusLabel: labels.reviewBadge } : {}),
  };
}

export function createExploreTopicLinks(
  topics: readonly string[],
  locale: Locale,
): RelatedTopicView[] {
  const topicIds = new Set(topics);
  return [...CONTENT_TOPIC_REGISTRY]
    .sort((left, right) => left.order - right.order)
    .filter((topic) => topicIds.has(topic.id))
    .map((topic) => ({
      id: topic.id,
      label: topic.label[locale],
      href: `/${locale}/topics/${topic.id}`,
    }));
}
