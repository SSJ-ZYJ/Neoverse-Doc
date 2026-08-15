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
