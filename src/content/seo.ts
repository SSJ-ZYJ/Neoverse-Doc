import type { Metadata } from 'next';
import { source } from '@/adapters/fumadocs/source';
import { isContentIndexable } from '@/content/maintenance';
import { getPageDictionary } from '@/dictionaries';
import { i18n, LANGUAGE_TAGS, type Locale, OPEN_GRAPH_LOCALES } from '@/lib/i18n';
import { parseAuthor } from '@/lib/parse-author';
import {
  AUTHOR_GITHUB_URL,
  AUTHOR_NAME,
  DOCS_LICENSE_URL,
  REPO_URL,
  SITE_ORIGIN,
} from '@/lib/site-config';

export type DocumentLanguagePaths = Partial<Record<Locale, string>>;

export interface DocumentSeoLinks {
  alternates: Metadata['alternates'];
  alternateOpenGraphLocales: string[];
}

export interface TechArticleJsonLdOptions {
  author?: string | string[];
  description?: string;
  locale: Locale;
  title: string;
  url: string;
}

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, SITE_ORIGIN).href;
}

export function getHomeAlternates(locale: Locale): Metadata['alternates'] {
  return {
    canonical: `/${locale}`,
    languages: {
      [LANGUAGE_TAGS.zh]: '/zh',
      [LANGUAGE_TAGS.en]: '/en',
      'x-default': '/',
    },
  };
}

/**
 * A document is a language alternate only when that concrete localized page
 * exists and is indexable. This prevents Fumadocs routes from implying a
 * translation that is missing, still a draft, or deprecated.
 *
 * 仅当具体语言页面真实存在且已发布时，才把它视为语言对应页，
 * 避免 Fumadocs 路由暗示不存在、仍为草稿或已 deprecated 的译文。
 */
export function getIndexableDocumentLanguagePaths(slugs: string[]): DocumentLanguagePaths {
  const paths: DocumentLanguagePaths = {};

  for (const locale of i18n.languages) {
    const page = source.getPage(slugs, locale);
    if (page && isContentIndexable(page.data.status)) paths[locale] = page.url;
  }

  return paths;
}

function createDocumentLanguageLinks(paths: DocumentLanguagePaths): Record<string, string> | null {
  const availableLocales = i18n.languages.filter((locale) => paths[locale]);
  if (availableLocales.length < 2) return null;

  const links: Record<string, string> = {};
  for (const locale of availableLocales) {
    links[LANGUAGE_TAGS[locale]] = paths[locale] as string;
  }

  const fallbackPath = paths.en ?? paths.zh;
  if (fallbackPath) links['x-default'] = fallbackPath;
  return links;
}

export function getDocumentSeoLinks(
  slugs: string[],
  locale: Locale,
  currentUrl: string,
  isNonIndexable: boolean,
): DocumentSeoLinks {
  if (isNonIndexable) {
    return {
      alternates: { canonical: currentUrl },
      alternateOpenGraphLocales: [],
    };
  }

  const paths = getIndexableDocumentLanguagePaths(slugs);
  const languages = createDocumentLanguageLinks(paths);
  const alternateOpenGraphLocales = i18n.languages
    .filter((candidate) => candidate !== locale && paths[candidate])
    .map((candidate) => OPEN_GRAPH_LOCALES[candidate]);

  return {
    alternates: {
      canonical: currentUrl,
      ...(languages ? { languages } : {}),
    },
    alternateOpenGraphLocales,
  };
}

export function createAbsoluteDocumentLanguageLinks(
  paths: DocumentLanguagePaths,
): Record<string, string> | undefined {
  const relativeLinks = createDocumentLanguageLinks(paths);
  if (!relativeLinks) return;

  return Object.fromEntries(
    Object.entries(relativeLinks).map(([language, pathname]) => [language, absoluteUrl(pathname)]),
  );
}

export function createWebSiteJsonLd(locale: Locale): Record<string, unknown> {
  const dict = getPageDictionary(locale);
  const localizedHomeUrl = absoluteUrl(`/${locale}`);

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${localizedHomeUrl}#website`,
    url: localizedHomeUrl,
    name: dict.siteTitle,
    description: dict.tagline,
    inLanguage: LANGUAGE_TAGS[locale],
    publisher: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      url: AUTHOR_GITHUB_URL,
    },
    sameAs: REPO_URL,
  };
}

export function createTechArticleJsonLd({
  author,
  description,
  locale,
  title,
  url,
}: TechArticleJsonLdOptions): Record<string, unknown> {
  const authors = author ? parseAuthor(author) : [{ name: AUTHOR_NAME, url: AUTHOR_GITHUB_URL }];
  const articleUrl = absoluteUrl(url);

  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    '@id': `${articleUrl}#article`,
    url: articleUrl,
    mainEntityOfPage: articleUrl,
    headline: title,
    ...(description ? { description } : {}),
    inLanguage: LANGUAGE_TAGS[locale],
    isAccessibleForFree: true,
    license: DOCS_LICENSE_URL,
    author: authors.map((item) => ({
      '@type': 'Person',
      name: item.name,
      ...(item.url ? { url: item.url } : {}),
    })),
    publisher: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      url: AUTHOR_GITHUB_URL,
    },
    isPartOf: {
      '@type': 'WebSite',
      '@id': `${absoluteUrl(`/${locale}`)}#website`,
      name: getPageDictionary(locale).siteTitle,
      url: absoluteUrl(`/${locale}`),
    },
  };
}

export function createBreadcrumbJsonLd(slugs: string[], locale: Locale): Record<string, unknown> {
  const dict = getPageDictionary(locale);
  const itemListElement: Record<string, unknown>[] = [
    {
      '@type': 'ListItem',
      position: 1,
      name: dict.siteTitle,
      item: absoluteUrl(`/${locale}`),
    },
  ];

  for (let depth = 1; depth <= slugs.length; depth += 1) {
    const page = source.getPage(slugs.slice(0, depth), locale);
    if (!page || !isContentIndexable(page.data.status)) continue;

    itemListElement.push({
      '@type': 'ListItem',
      position: itemListElement.length + 1,
      name: page.data.title,
      item: absoluteUrl(page.url),
    });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  };
}
