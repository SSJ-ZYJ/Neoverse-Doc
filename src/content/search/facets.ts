import type { SearchMetadataProjectionEntry } from '@/content/projections';
import {
  CONTENT_TAXONOMY,
  type ContentTopic,
  type ContentTrack,
  type ContentType,
  type Difficulty,
} from '@/content/taxonomy';
import type { Locale } from '@/lib/i18n';

export const SEARCH_TAG_PREFIX = {
  contentType: 'content-type:',
  difficulty: 'difficulty:',
  topic: 'topic:',
  track: 'track:',
} as const;

const SEARCH_FACET_REGISTRIES = [
  {
    id: 'track',
    tagPrefix: SEARCH_TAG_PREFIX.track,
    registry: CONTENT_TAXONOMY.tracks,
  },
  {
    id: 'topic',
    tagPrefix: SEARCH_TAG_PREFIX.topic,
    registry: CONTENT_TAXONOMY.topics,
  },
  {
    id: 'type',
    tagPrefix: SEARCH_TAG_PREFIX.contentType,
    registry: CONTENT_TAXONOMY.types,
  },
  {
    id: 'difficulty',
    tagPrefix: SEARCH_TAG_PREFIX.difficulty,
    registry: CONTENT_TAXONOMY.difficulties,
  },
] as const;

export type SearchFacetKey = (typeof SEARCH_FACET_REGISTRIES)[number]['id'];

export interface SearchFacetOption {
  readonly id: string;
  readonly label: string;
}

export interface SearchFacetDefinition {
  readonly id: SearchFacetKey;
  readonly tagPrefix: string;
  readonly options: readonly SearchFacetOption[];
}

export type SearchFacetSelection = Partial<Record<SearchFacetKey, string>>;

/**
 * Search facet options are projected directly from the Taxonomy Registry.
 * The UI receives IDs, localized labels, and registry order; it never owns a
 * second list of legal taxonomy values.
 * 搜索筛选项直接从 Taxonomy Registry 投影。UI 只接收 ID、多语言名称与注册表
 * 顺序，不维护第二份合法分类列表。
 */
export function getSearchFacetDefinitions(locale: Locale): readonly SearchFacetDefinition[] {
  return SEARCH_FACET_REGISTRIES.map((facet) => ({
    id: facet.id,
    tagPrefix: facet.tagPrefix,
    options: [...facet.registry]
      .sort((left, right) => left.order - right.order)
      .map((entry) => ({ id: entry.id, label: entry.label[locale] })),
  }));
}

export function createSearchFacetTag(key: SearchFacetKey, value: string): string {
  const facet = SEARCH_FACET_REGISTRIES.find((candidate) => candidate.id === key);
  if (!facet?.registry.some((entry) => entry.id === value)) {
    throw new Error(`Unknown search facet value: ${key}=${value}`);
  }
  return facet.tagPrefix + value;
}

/**
 * Splits the existing single-tag intent into the compatible Chapter scope or
 * one taxonomy selection. Different dimensions are combined by the dialog.
 * 将既有单 tag 意图解析为兼容的 Chapter 范围或一个分类选择；不同维度由弹窗
 * 负责组合。
 */
export function parseSearchTag(tag: string | undefined): {
  readonly chapter?: string;
  readonly facets: SearchFacetSelection;
} {
  const facets: SearchFacetSelection = {};
  if (tag === undefined) return { facets };

  const facet = SEARCH_FACET_REGISTRIES.find((candidate) => tag.startsWith(candidate.tagPrefix));
  if (facet) {
    const value = tag.slice(facet.tagPrefix.length);
    if (facet.registry.some((entry) => entry.id === value)) {
      facets[facet.id] = value;
      return { facets };
    }
  }

  return { chapter: tag, facets };
}

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
