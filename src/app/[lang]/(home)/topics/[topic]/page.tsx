import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isContentIndexable } from '@/content/maintenance';
import { contentProjectionSources, getExploreProjection } from '@/content/projections';
import { createSearchFilterTags } from '@/content/search';
import { CONTENT_TOPIC_REGISTRY } from '@/content/taxonomy';
import { getPageDictionary } from '@/dictionaries';
import {
  createExploreContentView,
  type ExploreContentView,
  ExplorePageShell,
  type RelatedTopicView,
  TopicPage,
} from '@/features/explore';
import { i18n, LANGUAGE_TAGS, OPEN_GRAPH_LOCALES, resolveLocale } from '@/lib/i18n';
import { SOCIAL_IMAGE } from '@/lib/site-config';

function getTopicEntry(topicId: string) {
  return CONTENT_TOPIC_REGISTRY.find((entry) => entry.id === topicId);
}

function getTopicProjection(locale: ReturnType<typeof resolveLocale>, topicId: string) {
  return getExploreProjection(locale).topics.find((topic) => topic.topicId === topicId);
}

function createTopicAlternates(topicId: string): NonNullable<Metadata['alternates']> {
  const languages = Object.fromEntries(
    i18n.languages
      .filter((locale) => getTopicProjection(locale, topicId) !== undefined)
      .map((locale) => [LANGUAGE_TAGS[locale], `/${locale}/topics/${topicId}`]),
  );
  const defaultPath = languages[LANGUAGE_TAGS[i18n.defaultLanguage]];

  return {
    languages: {
      ...languages,
      ...(defaultPath ? { 'x-default': defaultPath } : {}),
    },
  };
}

function createTopicContentViews(
  locale: ReturnType<typeof resolveLocale>,
  contentIds: readonly string[],
): ExploreContentView[] {
  const copy = getPageDictionary(locale);
  const labels = {
    actionLabel: copy.topics.viewTopic,
    contentType: copy.topics.contentType,
    difficulty: copy.topics.difficulty,
    reviewBadge: copy.reviewBadge,
  };
  const manifestById = new Map(
    contentProjectionSources.manifest
      .filter((entry) => entry.locale === locale)
      .map((entry) => [entry.id, entry] as const),
  );

  return contentIds.flatMap((contentId) => {
    const entry = manifestById.get(contentId);
    return entry ? [createExploreContentView(entry, locale, labels)] : [];
  });
}

function createRelatedTopicViews(
  locale: ReturnType<typeof resolveLocale>,
  topicId: string,
  contentIds: readonly string[],
): RelatedTopicView[] {
  const localeEntries = new Map(
    contentProjectionSources.manifest
      .filter((entry) => entry.locale === locale && isContentIndexable(entry.status))
      .map((entry) => [entry.id, entry] as const),
  );
  const relatedTopicIds = new Set<string>();

  for (const contentId of contentIds) {
    const relatedIds = [
      ...contentProjectionSources.graph.getRelated(contentId),
      ...contentProjectionSources.graph.getRelatedBy(contentId),
    ];
    for (const relatedId of relatedIds) {
      const relatedEntry = localeEntries.get(relatedId);
      if (!relatedEntry) continue;
      for (const relatedTopicId of relatedEntry.topics ?? []) {
        if (relatedTopicId !== topicId) relatedTopicIds.add(relatedTopicId);
      }
    }
  }

  return [...CONTENT_TOPIC_REGISTRY]
    .sort((left, right) => left.order - right.order)
    .filter((topic) => relatedTopicIds.has(topic.id))
    .map((topic) => ({
      id: topic.id,
      label: topic.label[locale],
      href: `/${locale}/topics/${topic.id}`,
    }));
}

export function generateStaticParams() {
  return i18n.languages.flatMap((locale) =>
    getExploreProjection(locale).topics.map((topic) => ({
      lang: locale,
      topic: topic.topicId,
    })),
  );
}

export async function generateMetadata(
  props: PageProps<'/[lang]/topics/[topic]'>,
): Promise<Metadata> {
  const { lang, topic: topicId } = await props.params;
  const locale = resolveLocale(lang);
  const projection = getTopicProjection(locale, topicId);
  const topicEntry = getTopicEntry(topicId);
  if (!projection || !topicEntry) notFound();

  const dict = getPageDictionary(locale);
  const title = topicEntry.label[locale];
  const description = topicEntry.description?.[locale] ?? dict.topics.description;
  const url = `/${locale}/topics/${topicId}`;

  return {
    title,
    description,
    alternates: { canonical: url, ...createTopicAlternates(topicId) },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: dict.siteTitle,
      locale: OPEN_GRAPH_LOCALES[locale],
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [SOCIAL_IMAGE],
    },
  };
}

export default async function TopicRoute(props: PageProps<'/[lang]/topics/[topic]'>) {
  const { lang, topic: topicId } = await props.params;
  const locale = resolveLocale(lang);
  const projection = getTopicProjection(locale, topicId);
  const topicEntry = getTopicEntry(topicId);
  if (!projection || !topicEntry) notFound();

  const copy = getPageDictionary(locale);
  const searchTag = createSearchFilterTags({ topics: [projection.topicId] })[0];
  if (!searchTag) throw new Error(`Search tag is missing for Topic ${projection.topicId}.`);

  return (
    <ExplorePageShell locale={locale}>
      <TopicPage
        backHref={`/${locale}/topics`}
        copy={copy.topics}
        description={topicEntry.description?.[locale]}
        entries={createTopicContentViews(locale, projection.contentIds)}
        label={topicEntry.label[locale]}
        relatedTopics={createRelatedTopicViews(locale, projection.topicId, projection.contentIds)}
        searchQuery={topicEntry.label[locale]}
        searchTag={searchTag}
      />
    </ExplorePageShell>
  );
}
