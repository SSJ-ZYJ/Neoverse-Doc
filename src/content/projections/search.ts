import type { ContentTopic, ContentTrack, ContentType, Difficulty } from '@/content/taxonomy';
import type { Locale } from '@/lib/i18n';
import type { ContentProjectionSources } from './sources';

/**
 * Page-level taxonomy metadata consumed by the Search corpus builder. It is a
 * projection over Manifest entries, not a second content registry. The
 * chapterScope is intentionally a backwards-compatible search scope only and
 * must never be interpreted as a Topic.
 *
 * Search 语料构建器消费的页级 taxonomy 元数据。它是 Manifest 的投影，
 * 不是第二份内容注册表。chapterScope 仅用于兼容既有搜索范围，绝不能被
 * 当作 Topic。
 */
export interface SearchMetadataProjectionEntry {
  readonly searchPageId: string;
  readonly contentId: string;
  readonly locale: Locale;
  readonly chapterScope?: string;
  readonly contentType?: ContentType;
  readonly topics?: readonly ContentTopic[];
  readonly tracks?: readonly ContentTrack[];
  readonly difficulty?: Difficulty;
}

export function createSearchMetadataProjection(
  sources: ContentProjectionSources,
): readonly SearchMetadataProjectionEntry[] {
  return sources.manifest.map((entry) => ({
    searchPageId: `${entry.id}:${entry.locale}`,
    contentId: entry.id,
    locale: entry.locale,
    ...(entry.slugs[0] !== undefined ? { chapterScope: entry.slugs[0] } : {}),
    ...(entry.type !== undefined ? { contentType: entry.type } : {}),
    ...(entry.topics !== undefined ? { topics: [...entry.topics] } : {}),
    ...(entry.tracks !== undefined ? { tracks: [...entry.tracks] } : {}),
    ...(entry.difficulty !== undefined ? { difficulty: entry.difficulty } : {}),
  }));
}
