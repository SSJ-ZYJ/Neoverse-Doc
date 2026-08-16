import type { ContentManifestEntry } from '@/content/generated/manifest';
import { isContentIndexable } from '@/content/maintenance';
import { CONTENT_TRACK_REGISTRY, type ContentTrack } from '@/content/taxonomy';
import { i18n, type Locale } from '@/lib/i18n';
import type { ContentProjectionSources } from './sources';

export interface ContinueLearningCatalogEntry {
  readonly contentId: string;
  readonly title: string;
  readonly href: string;
  readonly trackId?: ContentTrack;
  readonly trackLabel?: string;
}

export interface ContinueLearningCatalog {
  readonly entries: readonly ContinueLearningCatalogEntry[];
  readonly validContentIds: readonly string[];
}

function getReadableEntry(
  entries: readonly ContentManifestEntry[],
  contentId: string,
  locale: Locale,
): ContentManifestEntry | undefined {
  const locales = [...new Set([locale, i18n.defaultLanguage])];
  for (const candidateLocale of locales) {
    const entry = entries.find(
      (candidate) =>
        candidate.id === contentId &&
        candidate.locale === candidateLocale &&
        isContentIndexable(candidate.status),
    );
    if (entry) return entry;
  }
  return undefined;
}

function getCanonicalTrack(entry: ContentManifestEntry, locale: Locale) {
  const track = [...(entry.tracks ?? [])]
    .map((trackId) => CONTENT_TRACK_REGISTRY.find((candidate) => candidate.id === trackId))
    .filter(
      (candidate): candidate is (typeof CONTENT_TRACK_REGISTRY)[number] => candidate !== undefined,
    )
    .sort((left, right) => left.order - right.order)[0];
  if (!track) return undefined;
  return {
    trackId: track.id as ContentTrack,
    trackLabel: track.label[locale],
  };
}

/**
 * Builds the client-safe catalog used to resolve local activity back to the
 * current Manifest location. The stored activity never contains these fields.
 *
 * 构建客户端安全的目录，用于把本地活动解析回当前 Manifest 位置；本地
 * 活动本身永不保存这些字段。
 */
export function createContinueLearningCatalog(
  locale: Locale,
  sources: ContentProjectionSources,
): ContinueLearningCatalog {
  const validContentIds = [
    ...new Set(
      sources.manifest.filter((entry) => isContentIndexable(entry.status)).map((entry) => entry.id),
    ),
  ];

  const entries = validContentIds.flatMap((contentId) => {
    const entry = getReadableEntry(sources.manifest, contentId, locale);
    if (!entry) return [];
    const track = getCanonicalTrack(entry, locale);
    return [
      {
        contentId,
        title: entry.title,
        href: entry.url,
        ...(track ?? {}),
      },
    ];
  });

  return { entries, validContentIds };
}
