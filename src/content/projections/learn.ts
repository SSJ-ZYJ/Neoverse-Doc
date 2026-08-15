import type { ContentTrack } from '@/content/taxonomy';
import type { Locale } from '@/lib/i18n';
import type { ContentProjectionSources } from './sources';
import { getLocaleContentOrder, getLocaleManifestEntries, sortContentIds } from './utils';

export interface LearnStepProjection {
  readonly contentId: string;
  readonly prerequisiteIds: readonly string[];
  readonly requiredByIds: readonly string[];
}

export interface LearnTrackProjection {
  readonly trackId: ContentTrack;
  readonly steps: readonly LearnStepProjection[];
}

export interface LearnProjection {
  readonly locale: Locale;
  readonly tracks: readonly LearnTrackProjection[];
}

function orderTrackContentIds(
  contentIds: readonly string[],
  sources: ContentProjectionSources,
  locale: Locale,
): string[] {
  const sourceOrder = getLocaleContentOrder(sources, locale);
  const trackContentIds = new Set(contentIds);
  const remainingPrerequisites = new Map(
    contentIds.map((contentId) => [
      contentId,
      new Set(
        sources.graph
          .getPrerequisites(contentId)
          .filter((prerequisiteId) => trackContentIds.has(prerequisiteId)),
      ),
    ]),
  );
  const ready = sortContentIds(
    contentIds.filter((contentId) => remainingPrerequisites.get(contentId)?.size === 0),
    sourceOrder,
  );
  const ordered: string[] = [];

  while (ready.length > 0) {
    const contentId = ready.shift();
    if (contentId === undefined) break;
    ordered.push(contentId);

    for (const requiredById of sources.graph.getRequiredBy(contentId)) {
      const prerequisites = remainingPrerequisites.get(requiredById);
      if (prerequisites === undefined) continue;
      prerequisites.delete(contentId);
      if (prerequisites.size === 0) {
        ready.push(requiredById);
        ready.sort((left, right) => {
          const leftOrder = sourceOrder.get(left) ?? Number.POSITIVE_INFINITY;
          const rightOrder = sourceOrder.get(right) ?? Number.POSITIVE_INFINITY;
          return leftOrder - rightOrder || left.localeCompare(right);
        });
      }
    }
  }

  if (ordered.length !== contentIds.length) {
    throw new Error('Learn projection received a cyclic track prerequisite graph.');
  }

  return ordered;
}

/**
 * Derives locale-specific learning routes. Track membership comes exclusively
 * from the taxonomy fields; explicit graph edges remain stable Content IDs,
 * including prerequisites outside the current track or locale.
 *
 * 派生 locale 专属的学习路线。Track 归属只来自 taxonomy 字段；显式图谱边
 * 始终保留为稳定 Content ID，包括当前 Track 或 locale 之外的前置条件。
 */
export function createLearnProjection(
  locale: Locale,
  sources: ContentProjectionSources,
): LearnProjection {
  const localeEntries = getLocaleManifestEntries(sources, locale);

  return {
    locale,
    tracks: [...sources.taxonomy.tracks]
      .sort((left, right) => left.order - right.order)
      .flatMap((track) => {
        const contentIds = localeEntries
          .filter((entry) => entry.tracks?.includes(track.id))
          .map((entry) => entry.id);
        if (contentIds.length === 0) return [];

        return [
          {
            trackId: track.id,
            steps: orderTrackContentIds(contentIds, sources, locale).map((contentId) => ({
              contentId,
              prerequisiteIds: [...sources.graph.getPrerequisites(contentId)],
              requiredByIds: [...sources.graph.getRequiredBy(contentId)],
            })),
          },
        ];
      }),
  };
}

/**
 * Returns every uncompleted step whose full prerequisite set has been met.
 * Consumers can resolve labels, URLs, and other content metadata from the
 * Manifest without the Learn projection duplicating it.
 *
 * 返回所有尚未完成且全部前置条件已满足的步骤。消费方可从 Manifest 解析名称、
 * URL 等内容元数据，Learn 投影不复制这些字段。
 */
export function getRecommendedNextSteps(
  projection: LearnProjection,
  completedContentIds: ReadonlySet<string>,
): readonly LearnStepProjection[] {
  return projection.tracks.flatMap((track) =>
    track.steps.filter(
      (step) =>
        !completedContentIds.has(step.contentId) &&
        step.prerequisiteIds.every((prerequisiteId) => completedContentIds.has(prerequisiteId)),
    ),
  );
}
