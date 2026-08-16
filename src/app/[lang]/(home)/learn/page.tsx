import type { Metadata } from 'next';
import { getLearnProjection } from '@/content/projections';
import { CONTENT_TRACK_REGISTRY } from '@/content/taxonomy';
import { getPageDictionary } from '@/dictionaries';
import { LearnLandingPage, LearnPageShell, type LearnTrackView } from '@/features/learn';
import {
  generateLocaleStaticParams,
  i18n,
  LANGUAGE_TAGS,
  OPEN_GRAPH_LOCALES,
  resolveLocale,
} from '@/lib/i18n';
import { SOCIAL_IMAGE } from '@/lib/site-config';

export const generateStaticParams = generateLocaleStaticParams;

function createLearnAlternates(): NonNullable<Metadata['alternates']> {
  return {
    languages: {
      ...Object.fromEntries(
        i18n.languages.map((locale) => [LANGUAGE_TAGS[locale], `/${locale}/learn`]),
      ),
      'x-default': `/${i18n.defaultLanguage}/learn`,
    },
  };
}

export async function generateMetadata(props: PageProps<'/[lang]/learn'>): Promise<Metadata> {
  const { lang } = await props.params;
  const locale = resolveLocale(lang);
  const dict = getPageDictionary(locale);
  const url = `/${locale}/learn`;

  return {
    title: dict.learnTitle,
    description: dict.learn.description,
    alternates: { canonical: url, ...createLearnAlternates() },
    openGraph: {
      type: 'website',
      url,
      title: dict.learnTitle,
      description: dict.learn.description,
      siteName: dict.siteTitle,
      locale: OPEN_GRAPH_LOCALES[locale],
      images: [SOCIAL_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.learnTitle,
      description: dict.learn.description,
      images: [SOCIAL_IMAGE],
    },
  };
}

export default async function LearnPage({ params }: PageProps<'/[lang]/learn'>) {
  const { lang } = await params;
  const locale = resolveLocale(lang);
  const projection = getLearnProjection(locale);
  const tracks: LearnTrackView[] = projection.tracks.flatMap((track) => {
    const entry = CONTENT_TRACK_REGISTRY.find((candidate) => candidate.id === track.trackId);
    if (!entry) return [];

    return [
      {
        id: track.trackId,
        label: entry.label[locale],
        description: entry.description?.[locale],
        href: `/${locale}/learn/${track.trackId}`,
        backHref: `/${locale}/learn`,
        stepCount: track.steps.length,
      },
    ];
  });

  return (
    <LearnPageShell locale={locale}>
      <LearnLandingPage copy={getPageDictionary(locale).learn} tracks={tracks} />
    </LearnPageShell>
  );
}
