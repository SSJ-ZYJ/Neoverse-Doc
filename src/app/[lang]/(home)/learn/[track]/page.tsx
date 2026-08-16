import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isContentIndexable } from '@/content/maintenance';
import {
  contentProjectionSources,
  createContinueLearningCatalog,
  getLearnProjection,
} from '@/content/projections';
import { CONTENT_TRACK_REGISTRY } from '@/content/taxonomy';
import { getPageDictionary } from '@/dictionaries';
import {
  LearnPageShell,
  type LearnPrerequisiteView,
  type LearnStepView,
  LearnTrackPage,
  type LearnTrackView,
} from '@/features/learn';
import { i18n, LANGUAGE_TAGS, OPEN_GRAPH_LOCALES, resolveLocale } from '@/lib/i18n';
import { SOCIAL_IMAGE } from '@/lib/site-config';

export function generateStaticParams() {
  return i18n.languages.flatMap((locale) =>
    getLearnProjection(locale).tracks.map((track) => ({ lang: locale, track: track.trackId })),
  );
}

function getTrackEntry(trackId: string) {
  return CONTENT_TRACK_REGISTRY.find((entry) => entry.id === trackId);
}

function getTrackProjection(locale: ReturnType<typeof resolveLocale>, trackId: string) {
  return getLearnProjection(locale).tracks.find((track) => track.trackId === trackId);
}

function getLocalizedManifestEntry(id: string, locale: ReturnType<typeof resolveLocale>) {
  return (
    contentProjectionSources.manifest.find((entry) => entry.id === id && entry.locale === locale) ??
    contentProjectionSources.manifest.find(
      (entry) => entry.id === id && entry.locale === i18n.defaultLanguage,
    )
  );
}

function createStepViews(
  locale: ReturnType<typeof resolveLocale>,
  track: NonNullable<ReturnType<typeof getTrackProjection>>,
): LearnStepView[] {
  const localeEntries = new Map(
    contentProjectionSources.manifest
      .filter((entry) => entry.locale === locale)
      .map((entry) => [entry.id, entry] as const),
  );
  const trackContentIds = new Set(track.steps.map((step) => step.contentId));

  return track.steps.flatMap((step, index) => {
    const entry = localeEntries.get(step.contentId);
    if (!entry) return [];

    const prerequisites: LearnPrerequisiteView[] = step.prerequisiteIds.map((id) => {
      const prerequisiteEntry = getLocalizedManifestEntry(id, locale);
      const replacementEntry = prerequisiteEntry?.replacement
        ? getLocalizedManifestEntry(prerequisiteEntry.replacement, locale)
        : undefined;
      const replacement =
        replacementEntry && isContentIndexable(replacementEntry.status)
          ? { title: replacementEntry.title, href: replacementEntry.url }
          : undefined;

      return {
        id,
        title: prerequisiteEntry?.title ?? id,
        href:
          prerequisiteEntry && isContentIndexable(prerequisiteEntry.status)
            ? prerequisiteEntry.url
            : undefined,
        isInTrack: trackContentIds.has(id),
        replacement,
      };
    });

    return [
      {
        contentId: step.contentId,
        number: index + 1,
        title: entry.title,
        description: entry.description,
        href: entry.url,
        status: entry.status,
        estimatedMinutes: entry.estimatedMinutes,
        prerequisites,
      },
    ];
  });
}

function createTrackView(
  locale: ReturnType<typeof resolveLocale>,
  track: NonNullable<ReturnType<typeof getTrackProjection>>,
): LearnTrackView | undefined {
  const entry = getTrackEntry(track.trackId);
  if (!entry) return;

  return {
    id: track.trackId,
    label: entry.label[locale],
    description: entry.description?.[locale],
    href: `/${locale}/learn/${track.trackId}`,
    backHref: `/${locale}/learn`,
    stepCount: track.steps.length,
  };
}

function getTrackAlternates(trackId: string): NonNullable<Metadata['alternates']> {
  const languages = Object.fromEntries(
    i18n.languages
      .filter((locale) => getTrackProjection(locale, trackId) !== undefined)
      .map((locale) => [LANGUAGE_TAGS[locale], `/${locale}/learn/${trackId}`]),
  );
  const defaultPath = languages[LANGUAGE_TAGS[i18n.defaultLanguage]];

  return {
    languages: {
      ...languages,
      ...(defaultPath ? { 'x-default': defaultPath } : {}),
    },
  };
}

export async function generateMetadata(
  props: PageProps<'/[lang]/learn/[track]'>,
): Promise<Metadata> {
  const { lang, track: trackId } = await props.params;
  const locale = resolveLocale(lang);
  const projection = getTrackProjection(locale, trackId);
  const trackEntry = getTrackEntry(trackId);
  if (!projection || !trackEntry) notFound();

  const dict = getPageDictionary(locale);
  const title = trackEntry.label[locale];
  const description = trackEntry.description?.[locale] ?? dict.learn.description;
  const url = `/${locale}/learn/${trackId}`;

  return {
    title,
    description,
    alternates: { canonical: url, ...getTrackAlternates(trackId) },
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

export default async function LearnTrackRoute(props: PageProps<'/[lang]/learn/[track]'>) {
  const { lang, track: trackId } = await props.params;
  const locale = resolveLocale(lang);
  const projection = getTrackProjection(locale, trackId);
  if (!projection) notFound();

  const track = createTrackView(locale, projection);
  if (!track) notFound();
  const continueLearningCatalog = createContinueLearningCatalog(locale, contentProjectionSources);

  return (
    <LearnPageShell locale={locale}>
      <LearnTrackPage
        copy={getPageDictionary(locale).learn}
        steps={createStepViews(locale, projection)}
        track={track}
        validContentIds={continueLearningCatalog.validContentIds}
      />
    </LearnPageShell>
  );
}
