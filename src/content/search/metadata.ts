import {
  type SearchMetadataProjectionEntry,
  searchMetadataProjection,
} from '@/content/projections';
import type { Locale } from '@/lib/i18n';

/**
 * Static metadata sidecar for future Search result enrichment and filters.
 * It excludes body text because the Fumadocs export remains the sole full-text
 * corpus. Entries are keyed by the stable page search ID.
 *
 * 为未来 Search 结果增强和过滤准备的静态元数据 Sidecar。它不包含正文，
 * 因为 Fumadocs 导出仍是唯一全文语料。条目以稳定页级搜索 ID 为 key。
 */
export const searchMetadataSidecar = searchMetadataProjection;

const metadataBySearchPageId = new Map(
  searchMetadataSidecar.map((entry) => [entry.searchPageId, entry] as const),
);

export function getSearchPageMetadata(
  contentId: string,
  locale: Locale,
): SearchMetadataProjectionEntry | undefined {
  return metadataBySearchPageId.get(`${contentId}:${locale}`);
}
