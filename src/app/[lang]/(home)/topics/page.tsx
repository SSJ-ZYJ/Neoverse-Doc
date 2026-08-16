import type { Metadata } from 'next';
import { getExploreProjection } from '@/content/projections';
import { CONTENT_TOPIC_REGISTRY } from '@/content/taxonomy';
import { getPageDictionary } from '@/dictionaries';
import { ExplorePageShell, type ExploreTopicView, TopicsLandingPage } from '@/features/explore';
import {
  generateLocaleStaticParams,
  i18n,
  LANGUAGE_TAGS,
  OPEN_GRAPH_LOCALES,
  resolveLocale,
} from '@/lib/i18n';
import { SOCIAL_IMAGE } from '@/lib/site-config';

export const generateStaticParams = generateLocaleStaticParams;

function createTopicsAlternates(): NonNullable<Metadata['alternates']> {
  return {
    languages: {
      ...Object.fromEntries(
        i18n.languages.map((locale) => [LANGUAGE_TAGS[locale], `/${locale}/topics`]),
      ),
      'x-default': `/${i18n.defaultLanguage}/topics`,
    },
  };
}

export async function generateMetadata(props: PageProps<'/[lang]/topics'>): Promise<Metadata> {
  const { lang } = await props.params;
  const locale = resolveLocale(lang);
  const dict = getPageDictionary(locale);
  const url = `/${locale}/topics`;

  return {
    title: dict.topics.title,
    description: dict.topics.description,
    alternates: { canonical: url, ...createTopicsAlternates() },
    openGraph: {
      type: 'website',
      url,
      title: dict.topics.title,
      description: dict.topics.description,
      siteName: dict.siteTitle,
      locale: OPEN_GRAPH_LOCALES[locale],
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.topics.title,
      description: dict.topics.description,
      images: [SOCIAL_IMAGE],
    },
  };
}

export default async function TopicsPage({ params }: PageProps<'/[lang]/topics'>) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const projection = getExploreProjection(locale);
  const topics: ExploreTopicView[] = projection.topics.flatMap((topic) => {
    const entry = CONTENT_TOPIC_REGISTRY.find((candidate) => candidate.id === topic.topicId);
    if (!entry) return [];

    return [
      {
        id: topic.topicId,
        label: entry.label[locale],
        description: entry.description?.[locale],
        href: `/${locale}/topics/${topic.topicId}`,
        contentCount: topic.contentIds.length,
      },
    ];
  });

  return (
    <ExplorePageShell locale={locale}>
      <TopicsLandingPage copy={getPageDictionary(locale).topics} topics={topics} />
    </ExplorePageShell>
  );
}
