import type { ContentTopic } from '@/content/taxonomy';
import type { Locale } from '@/lib/i18n';
import type { ContentProjectionSources } from './sources';
import { getLocaleContentOrder, getLocaleManifestEntries, sortContentIds } from './utils';

export interface ExploreTopicProjection {
  readonly topicId: ContentTopic;
  readonly contentIds: readonly string[];
}

export interface ExploreProjection {
  readonly locale: Locale;
  readonly topics: readonly ExploreTopicProjection[];
}

/**
 * Groups content by explicitly declared Topics. Chapter slugs never contribute
 * to this projection: chapter is an authoring sequence, whereas Topic is
 * product taxonomy.
 *
 * 按作者显式声明的 Topic 聚合内容。Chapter slug 从不参与本投影：
 * Chapter 是作者编排顺序，Topic 才是产品分类。
 */
export function createExploreProjection(
  locale: Locale,
  sources: ContentProjectionSources,
): ExploreProjection {
  const localeEntries = getLocaleManifestEntries(sources, locale);
  const sourceOrder = getLocaleContentOrder(sources, locale);

  return {
    locale,
    topics: [...sources.taxonomy.topics]
      .sort((left, right) => left.order - right.order)
      .flatMap((topic) => {
        const contentIds = sortContentIds(
          localeEntries
            .filter((entry) => entry.topics?.includes(topic.id))
            .map((entry) => entry.id),
          sourceOrder,
        );
        return contentIds.length > 0 ? [{ topicId: topic.id, contentIds }] : [];
      }),
  };
}
