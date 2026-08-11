import type { MetadataRoute } from 'next';
import { i18n, LANGUAGE_TAGS } from '@/lib/i18n';
import {
  absoluteUrl,
  createAbsoluteDocumentLanguageLinks,
  getIndexableDocumentLanguagePaths,
} from '@/lib/seo';
import { source } from '@/lib/source';

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

  for (const locale of i18n.languages) {
    for (const page of source.getPages(locale)) {
      if (page.data.draft === true) continue;

      const languagePaths = getIndexableDocumentLanguagePaths(page.slugs);
      const languages = createAbsoluteDocumentLanguageLinks(languagePaths);

      entries.push({
        url: absoluteUrl(page.url),
        ...(languages ? { alternates: { languages } } : {}),
      });
    }
  }

  return entries.sort((left, right) => left.url.localeCompare(right.url));
}
