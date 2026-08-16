import type { MetadataRoute } from 'next';
import { contentManifest, getContentLanguagePaths } from '@/content/generated/manifest';
import { isContentIndexable } from '@/content/maintenance';
import { absoluteUrl, createAbsoluteDocumentLanguageLinks } from '@/content/seo';
import { i18n, LANGUAGE_TAGS } from '@/lib/i18n';

export const dynamic = 'force-static';

const homeLanguages = {
  [LANGUAGE_TAGS.zh]: absoluteUrl('/zh'),
  [LANGUAGE_TAGS.en]: absoluteUrl('/en'),
  'x-default': absoluteUrl('/'),
};

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = i18n.languages.map((locale) => ({
    url: absoluteUrl(`/${locale}`),
    alternates: { languages: homeLanguages },
  }));

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
