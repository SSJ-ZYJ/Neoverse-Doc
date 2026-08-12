import { source } from '@/adapters/fumadocs/source';
import { i18n, type Locale } from '@/lib/i18n';

export interface ContentManifestEntry {
  id: string;
  locale: Locale;
  url: string;
  title: string;
  description?: string;
  slugs: string[];
  draft?: boolean;
}

type ManifestPage = {
  data: {
    title: string;
    description?: string;
    draft?: boolean;
  };
  locale?: string;
  slugs: string[];
  url: string;
};

export function createContentId(slugs: readonly string[]): string {
  return `docs:${slugs.join('/')}`;
}

export function createContentManifestEntry(
  page: ManifestPage,
  locale: Locale,
): ContentManifestEntry {
  return {
    id: createContentId(page.slugs),
    locale,
    url: page.url,
    title: page.data.title,
    ...(page.data.description ? { description: page.data.description } : {}),
    slugs: [...page.slugs],
    ...(page.data.draft === true ? { draft: true } : {}),
  };
}

export const contentManifest = Object.freeze(
  i18n.languages.flatMap((locale) =>
    source.getPages(locale).map((page) => createContentManifestEntry(page, locale)),
  ),
) satisfies readonly ContentManifestEntry[];

const entriesByIdentity = new Map(
  contentManifest.map((entry) => [`${entry.id}:${entry.locale}`, entry] as const),
);

export function getContentManifestEntry(
  id: string,
  locale: Locale,
): ContentManifestEntry | undefined {
  return entriesByIdentity.get(`${id}:${locale}`);
}

export function getContentLanguagePaths(id: string): Partial<Record<Locale, string>> {
  const paths: Partial<Record<Locale, string>> = {};
  for (const entry of contentManifest) {
    if (entry.id === id) paths[entry.locale] = entry.url;
  }
  return paths;
}
