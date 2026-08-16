import type { Metadata } from 'next';
import { contentProjectionSources, getReferenceProjection } from '@/content/projections';
import { createSearchFilterTags } from '@/content/search';
import { CONTENT_TYPE_REGISTRY } from '@/content/taxonomy';
import { getPageDictionary } from '@/dictionaries';
import {
  createExploreContentView,
  type ExploreContentView,
  ExplorePageShell,
  ReferencePage,
} from '@/features/explore';
import {
  generateLocaleStaticParams,
  i18n,
  LANGUAGE_TAGS,
  OPEN_GRAPH_LOCALES,
  resolveLocale,
} from '@/lib/i18n';
import { SOCIAL_IMAGE } from '@/lib/site-config';

export const generateStaticParams = generateLocaleStaticParams;

function getReferenceType() {
  const referenceType = CONTENT_TYPE_REGISTRY.find((entry) => entry.id === 'reference');
  if (!referenceType) throw new Error('Reference content type is missing from the taxonomy.');
  return referenceType;
}

function createReferenceAlternates(): NonNullable<Metadata['alternates']> {
  return {
    languages: {
      ...Object.fromEntries(
        i18n.languages.map((locale) => [LANGUAGE_TAGS[locale], `/${locale}/reference`]),
      ),
      'x-default': `/${i18n.defaultLanguage}/reference`,
    },
  };
}

function createReferenceContentViews(
  locale: ReturnType<typeof resolveLocale>,
  contentIds: readonly string[],
): ExploreContentView[] {
  const copy = getPageDictionary(locale);
  const labels = {
    actionLabel: copy.reference.openContent,
    contentType: copy.reference.contentType,
    difficulty: copy.reference.difficulty,
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

export async function generateMetadata(props: PageProps<'/[lang]/reference'>): Promise<Metadata> {
  const { lang } = await props.params;
  const locale = resolveLocale(lang);
  const dict = getPageDictionary(locale);
  const referenceType = getReferenceType();
  const title = referenceType.label[locale];
  const description = referenceType.description?.[locale] ?? dict.tagline;
  const url = `/${locale}/reference`;

  return {
    title,
    description,
    alternates: { canonical: url, ...createReferenceAlternates() },
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

export default async function ReferenceRoute({ params }: PageProps<'/[lang]/reference'>) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const copy = getPageDictionary(locale);
  const referenceType = getReferenceType();
  const projection = getReferenceProjection(locale);
  const searchTag = createSearchFilterTags({ contentTypes: ['reference'] })[0];
  if (!searchTag) throw new Error('Search tag is missing for the Reference content type.');

  return (
    <ExplorePageShell locale={locale}>
      <ReferencePage
        copy={copy.reference}
        description={referenceType.description?.[locale]}
        entries={createReferenceContentViews(locale, projection.contentIds)}
        referenceTitle={referenceType.label[locale]}
        searchTag={searchTag}
      />
    </ExplorePageShell>
  );
}
