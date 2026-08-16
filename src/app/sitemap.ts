import type { MetadataRoute } from 'next';
import { contentManifest, getContentLanguagePaths } from '@/content/generated/manifest';
import { isContentIndexable } from '@/content/maintenance';
import { getExploreProjection, getLearnProjection } from '@/content/projections';
import { absoluteUrl, createAbsoluteDocumentLanguageLinks } from '@/content/seo';
import { i18n, LANGUAGE_TAGS, type Locale } from '@/lib/i18n';

export const dynamic = 'force-static';

const homeLanguages = {
  [LANGUAGE_TAGS.zh]: absoluteUrl('/zh'),
  [LANGUAGE_TAGS.en]: absoluteUrl('/en'),
  'x-default': absoluteUrl('/'),
};

const learnLanguages = Object.fromEntries(
  i18n.languages.map((locale) => [LANGUAGE_TAGS[locale], absoluteUrl(`/${locale}/learn`)]),
);
const topicsLanguages = Object.fromEntries(
  i18n.languages.map((locale) => [LANGUAGE_TAGS[locale], absoluteUrl(`/${locale}/topics`)]),
);
const referenceLanguages = Object.fromEntries(
  i18n.languages.map((locale) => [LANGUAGE_TAGS[locale], absoluteUrl(`/${locale}/reference`)]),
);

function createLearnAlternates(paths: Partial<Record<Locale, string>>) {
  const languages = Object.fromEntries(
    i18n.languages
      .filter((locale) => paths[locale] !== undefined)
      .map((locale) => [LANGUAGE_TAGS[locale], absoluteUrl(paths[locale] as string)]),
  );
  const defaultPath = paths[i18n.defaultLanguage];

  return {
    languages: {
      ...languages,
      ...(defaultPath ? { 'x-default': absoluteUrl(defaultPath) } : {}),
    },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = i18n.languages.map((locale) => ({
    url: absoluteUrl(`/${locale}`),
    alternates: { languages: homeLanguages },
  }));

  for (const locale of i18n.languages) {
    entries.push({
      url: absoluteUrl(`/${locale}/learn`),
      alternates: { languages: learnLanguages },
    });
    entries.push({
      url: absoluteUrl(`/${locale}/topics`),
      alternates: { languages: topicsLanguages },
    });
    entries.push({
      url: absoluteUrl(`/${locale}/reference`),
      alternates: { languages: referenceLanguages },
    });
  }

  const trackPaths = new Map<string, Partial<Record<Locale, string>>>();
  for (const locale of i18n.languages) {
    for (const track of getLearnProjection(locale).tracks) {
      const paths = trackPaths.get(track.trackId) ?? {};
      paths[locale] = `/${locale}/learn/${track.trackId}`;
      trackPaths.set(track.trackId, paths);
    }
  }
  for (const paths of trackPaths.values()) {
    for (const locale of i18n.languages) {
      const path = paths[locale];
      if (!path) continue;
      entries.push({ url: absoluteUrl(path), alternates: createLearnAlternates(paths) });
    }
  }

  const topicPaths = new Map<string, Partial<Record<Locale, string>>>();
  for (const locale of i18n.languages) {
    for (const topic of getExploreProjection(locale).topics) {
      const paths = topicPaths.get(topic.topicId) ?? {};
      paths[locale] = `/${locale}/topics/${topic.topicId}`;
      topicPaths.set(topic.topicId, paths);
    }
  }
  for (const paths of topicPaths.values()) {
    for (const locale of i18n.languages) {
      const path = paths[locale];
      if (!path) continue;
      entries.push({ url: absoluteUrl(path), alternates: createLearnAlternates(paths) });
    }
  }

  for (const page of contentManifest) {
    if (!isContentIndexable(page.status)) continue;

    const publicPaths = getContentLanguagePaths(page.id);
    for (const locale of i18n.languages) {
      const localizedPage = contentManifest.find(
        (candidate) => candidate.id === page.id && candidate.locale === locale,
      );
      if (localizedPage && !isContentIndexable(localizedPage.status)) {
        delete publicPaths[locale];
      }
    }
    const languages = createAbsoluteDocumentLanguageLinks(publicPaths);
    entries.push({
      url: absoluteUrl(page.url),
      ...(languages ? { alternates: { languages } } : {}),
    });
  }

  return entries.sort((left, right) => left.url.localeCompare(right.url));
}
