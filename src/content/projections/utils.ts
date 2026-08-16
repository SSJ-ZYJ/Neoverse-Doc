import type { ContentManifestEntry } from '@/content/generated/manifest';
import type { ContentIrEntry } from '@/content/ir';
import type { Locale } from '@/lib/i18n';
import type { ContentProjectionSources } from './sources';

export function getLocaleManifestEntries(
  sources: ContentProjectionSources,
  locale: Locale,
): readonly ContentManifestEntry[] {
  return sources.manifest.filter((entry) => entry.locale === locale);
}

export function getLocaleContentOrder(
  sources: ContentProjectionSources,
  locale: Locale,
): ReadonlyMap<string, number> {
  // Content IR preserves the explicit Fumadocs page-tree order. Product
  // projections may use it only as a deterministic tie-breaker after explicit
  // graph edges; they never sort by a path segment, filename, or title.
  // Content IR 保留 Fumadocs 页面树中显式声明的顺序。产品投影只能在显式
  // 图谱边无法继续区分时把它作为确定性 tie-breaker，不按路径、文件名或标题排序。
  return new Map(
    sources.ir
      .filter((entry: ContentIrEntry) => entry.locale === locale)
      .map((entry, index) => [entry.id, index] as const),
  );
}

export function sortContentIds(
  contentIds: readonly string[],
  order: ReadonlyMap<string, number>,
): string[] {
  return [...contentIds].sort((left, right) => {
    const leftOrder = order.get(left) ?? Number.POSITIVE_INFINITY;
    const rightOrder = order.get(right) ?? Number.POSITIVE_INFINITY;
    return leftOrder - rightOrder || left.localeCompare(right);
  });
}
