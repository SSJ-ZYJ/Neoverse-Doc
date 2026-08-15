import type { Locale } from '@/lib/i18n';
import { createExploreProjection } from './explore';
import { createLearnProjection } from './learn';
import { createReferenceProjection } from './reference';
import { createSearchMetadataProjection } from './search';
import { contentProjectionSources } from './sources';

export type { ExploreProjection, ExploreTopicProjection } from './explore';
export { createExploreProjection } from './explore';
export type { LearnProjection, LearnStepProjection, LearnTrackProjection } from './learn';
export { createLearnProjection, getRecommendedNextSteps } from './learn';
export type { ReferenceProjection } from './reference';
export { createReferenceProjection } from './reference';
export type { SearchMetadataProjectionEntry } from './search';
export { createSearchMetadataProjection } from './search';
export type { ContentProjectionSources } from './sources';
export { contentProjectionSources } from './sources';

/**
 * Product-facing accessors share the same immutable Content Model inputs.
 * They return pure data and intentionally contain no React, DOM, or styling
 * concerns.
 *
 * 面向产品的访问器共享同一份不可变 Content Model 输入。它们只返回纯数据，
 * 刻意不包含 React、DOM 或样式职责。
 */
export function getLearnProjection(locale: Locale) {
  return createLearnProjection(locale, contentProjectionSources);
}

export function getExploreProjection(locale: Locale) {
  return createExploreProjection(locale, contentProjectionSources);
}

export function getReferenceProjection(locale: Locale) {
  return createReferenceProjection(locale, contentProjectionSources);
}

export const searchMetadataProjection = Object.freeze(
  createSearchMetadataProjection(contentProjectionSources),
);
