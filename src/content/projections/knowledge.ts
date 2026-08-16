import type { ContentManifestEntry } from '@/content/generated/manifest';
import { isContentIndexable } from '@/content/maintenance';
import { i18n, type Locale } from '@/lib/i18n';
import { createLearnProjection } from './learn';
import type { ContentProjectionSources } from './sources';

export interface DocumentKnowledgeProjection {
  readonly contentId: string;
  readonly prerequisiteIds: readonly string[];
  readonly recommendedNextId?: string;
  readonly relatedIds: readonly string[];
}

function uniqueIds(ids: readonly string[]): string[] {
  return [...new Set(ids)];
}

/**
 * Resolve a logical content node to a localized manifest entry. The current
 * locale is preferred, with the default language as the stable fallback when
 * a translation is not available.
 * 将逻辑内容节点解析为 locale 对应的 Manifest 条目。优先当前语言；译文
 * 不存在时回退默认语言，避免 Stable Content ID 关系变成死链。
 */
export function getKnowledgeManifestEntry(
  sources: ContentProjectionSources,
  contentId: string,
  locale: Locale,
): ContentManifestEntry | undefined {
  const locales = [...new Set([locale, i18n.defaultLanguage])];
  for (const candidateLocale of locales) {
    const entry = sources.manifest.find(
      (manifestEntry) => manifestEntry.id === contentId && manifestEntry.locale === candidateLocale,
    );
    if (entry !== undefined) return entry;
  }
  return undefined;
}

function getReadableKnowledgeEntry(
  sources: ContentProjectionSources,
  contentId: string,
  locale: Locale,
): ContentManifestEntry | undefined {
  const locales = [...new Set([locale, i18n.defaultLanguage])];
  for (const candidateLocale of locales) {
    const entry = sources.manifest.find(
      (manifestEntry) =>
        manifestEntry.id === contentId &&
        manifestEntry.locale === candidateLocale &&
        isContentIndexable(manifestEntry.status),
    );
    if (entry !== undefined) return entry;
  }
  return undefined;
}

function getNextTrackContentId(
  contentId: string,
  locale: Locale,
  sources: ContentProjectionSources,
): string | undefined {
  const learn = createLearnProjection(locale, sources);

  for (const track of learn.tracks) {
    const currentIndex = track.steps.findIndex((step) => step.contentId === contentId);
    const next = currentIndex >= 0 ? track.steps[currentIndex + 1] : undefined;
    if (
      next !== undefined &&
      getReadableKnowledgeEntry(sources, next.contentId, locale) !== undefined
    ) {
      return next.contentId;
    }
  }

  return undefined;
}

function firstReadableId(
  ids: readonly string[],
  contentId: string,
  excluded: ReadonlySet<string>,
  locale: Locale,
  sources: ContentProjectionSources,
): string | undefined {
  return ids.find(
    (candidateId) =>
      candidateId !== contentId &&
      !excluded.has(candidateId) &&
      getReadableKnowledgeEntry(sources, candidateId, locale) !== undefined,
  );
}

/**
 * Derives the reader-facing relationship order without copying content
 * metadata. The recommended item is intentionally singular and follows the
 * product priority: next in the current Learn track, requiredBy, then related.
 * 派生读者侧关系顺序，但不复制内容元数据。推荐项刻意只保留一个，优先级为：
 * 当前 Learn Track 下一项、requiredBy、related。
 */
export function createDocumentKnowledgeProjection(
  contentId: string,
  locale: Locale,
  sources: ContentProjectionSources,
): DocumentKnowledgeProjection {
  const prerequisiteIds = uniqueIds(sources.graph.getPrerequisites(contentId)).filter(
    (candidateId) => getKnowledgeManifestEntry(sources, candidateId, locale) !== undefined,
  );
  const prerequisiteSet = new Set(prerequisiteIds);
  const relatedCandidates = uniqueIds([
    ...sources.graph.getRelated(contentId),
    ...sources.graph.getRelatedBy(contentId),
  ]).filter(
    (candidateId) =>
      !prerequisiteSet.has(candidateId) &&
      getKnowledgeManifestEntry(sources, candidateId, locale) !== undefined,
  );

  const nextInTrackId = getNextTrackContentId(contentId, locale, sources);
  const requiredById = firstReadableId(
    sources.graph.getRequiredBy(contentId),
    contentId,
    new Set(nextInTrackId ? [nextInTrackId] : []),
    locale,
    sources,
  );
  const recommendedNextId =
    nextInTrackId ??
    requiredById ??
    firstReadableId(relatedCandidates, contentId, new Set(), locale, sources);

  return {
    contentId,
    prerequisiteIds,
    ...(recommendedNextId !== undefined ? { recommendedNextId } : {}),
    relatedIds: relatedCandidates.filter((candidateId) => candidateId !== recommendedNextId),
  };
}
