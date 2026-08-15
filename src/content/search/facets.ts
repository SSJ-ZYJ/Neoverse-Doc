import type { SearchMetadataProjectionEntry } from '@/content/projections';
import type { ContentTopic, ContentTrack, ContentType, Difficulty } from '@/content/taxonomy';

export const SEARCH_TAG_PREFIX = {
  contentType: 'content-type:',
  difficulty: 'difficulty:',
  topic: 'topic:',
  track: 'track:',
} as const;

export interface SearchTaxonomyFilters {
  readonly chapter?: string;
  readonly contentTypes?: readonly ContentType[];
  readonly difficulties?: readonly Difficulty[];
  readonly topics?: readonly ContentTopic[];
  readonly tracks?: readonly ContentTrack[];
}

/**
 * An intentionally data-only hook for future ranking. The current search
 * ordering remains untouched; callers can later turn these declared signals
 * into ranking policy without re-parsing frontmatter in the Search Feature.
 *
 * 为未来排序预留的纯数据接口。当前搜索排序保持不变；调用方未来可把这些
 * 声明信号转成排序策略，无需由 Search Feature 重新解析 frontmatter。
 */
export interface SearchRankingContext {
  readonly currentContentId?: string;
  readonly preferredContentTypes?: readonly ContentType[];
  readonly preferredTopics?: readonly ContentTopic[];
  readonly preferredTracks?: readonly ContentTrack[];
}

export function getSearchMetadataTags(metadata: SearchMetadataProjectionEntry): string[] {
  return Array.from(
    new Set([
      ...(metadata.chapterScope !== undefined ? [metadata.chapterScope] : []),
      ...(metadata.contentType !== undefined
        ? [SEARCH_TAG_PREFIX.contentType + metadata.contentType]
        : []),
      ...(metadata.difficulty !== undefined
        ? [SEARCH_TAG_PREFIX.difficulty + metadata.difficulty]
        : []),
      ...(metadata.topics?.map((topic) => SEARCH_TAG_PREFIX.topic + topic) ?? []),
      ...(metadata.tracks?.map((track) => SEARCH_TAG_PREFIX.track + track) ?? []),
    ]),
  );
}

/**
 * Produces native Fumadocs tag filters. Its multiple values intentionally
 * retain the engine's current AND semantics; choosing OR or multi-select
 * policy belongs to a future Search UI change.
 *
 * 生成原生 Fumadocs tag 过滤条件。多个值刻意保留当前引擎的 AND 语义；
 * OR 或多选策略属于未来 Search UI 的改动。
 */
export function createSearchFilterTags(filters: SearchTaxonomyFilters): string[] {
  return Array.from(
    new Set([
      ...(filters.chapter !== undefined ? [filters.chapter] : []),
      ...(filters.contentTypes?.map((type) => SEARCH_TAG_PREFIX.contentType + type) ?? []),
      ...(filters.difficulties?.map((difficulty) => SEARCH_TAG_PREFIX.difficulty + difficulty) ??
        []),
      ...(filters.topics?.map((topic) => SEARCH_TAG_PREFIX.topic + topic) ?? []),
      ...(filters.tracks?.map((track) => SEARCH_TAG_PREFIX.track + track) ?? []),
    ]),
  );
}
