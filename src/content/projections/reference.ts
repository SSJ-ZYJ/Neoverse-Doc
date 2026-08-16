import { isContentIndexable } from '@/content/maintenance';
import type { Locale } from '@/lib/i18n';
import type { ContentProjectionSources } from './sources';
import { getLocaleContentOrder, getLocaleManifestEntries, sortContentIds } from './utils';

export interface ReferenceProjection {
  readonly locale: Locale;
  readonly contentIds: readonly string[];
}

/**
 * Identifies readable reference-eligible content through the canonical content type.
 * It deliberately returns IDs only; display names and type metadata remain
 * owned by the Manifest and Taxonomy Registry.
 *
 * 通过统一的 Content Type 识别适合查阅且可公开阅读的内容。它刻意只返回 ID；
 * 显示名称与类型元数据仍由 Manifest 和 Taxonomy Registry 负责。
 */
export function createReferenceProjection(
  locale: Locale,
  sources: ContentProjectionSources,
): ReferenceProjection {
  const sourceOrder = getLocaleContentOrder(sources, locale);
  const contentIds = getLocaleManifestEntries(sources, locale)
    .filter((entry) => isContentIndexable(entry.status) && entry.type === 'reference')
    .map((entry) => entry.id);

  return {
    locale,
    contentIds: sortContentIds(contentIds, sourceOrder),
  };
}
