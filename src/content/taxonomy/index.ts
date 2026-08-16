import { CONTENT_TYPE_REGISTRY } from './content-types';
import { CONTENT_DIFFICULTY_REGISTRY } from './difficulties';
import { CONTENT_TOPIC_REGISTRY } from './topics';
import { CONTENT_TRACK_REGISTRY } from './tracks';

export type { ContentType } from './content-types';
export {
  CONTENT_TYPE_IDS,
  CONTENT_TYPE_REGISTRY,
} from './content-types';
export type { Difficulty } from './difficulties';
export {
  CONTENT_DIFFICULTY_IDS,
  CONTENT_DIFFICULTY_REGISTRY,
} from './difficulties';
export type { FreshnessPolicy, FreshnessPolicyId } from './maintenance';
export {
  FRESHNESS_POLICIES,
  FRESHNESS_POLICY_IDS,
  resolveFreshnessPolicy,
} from './maintenance';
export type { ContentTopic } from './topics';
export {
  CONTENT_TOPIC_IDS,
  CONTENT_TOPIC_REGISTRY,
} from './topics';
export type { ContentTrack } from './tracks';
export {
  CONTENT_TRACK_IDS,
  CONTENT_TRACK_REGISTRY,
} from './tracks';
export type {
  LocalizedTaxonomyText,
  TaxonomyEntries,
  TaxonomyEntry,
  TaxonomyId,
  TaxonomyIds,
} from './types';
export { defineTaxonomy, getTaxonomyEntry, getTaxonomyLabel, taxonomyIds } from './types';

/**
 * The public registry bundle. Individual registries remain typed so a consumer
 * can only look up IDs that belong to its taxonomy dimension.
 * 对外分类注册表集合；各维度保留独立类型约束。
 */
export const CONTENT_TAXONOMY = {
  types: CONTENT_TYPE_REGISTRY,
  topics: CONTENT_TOPIC_REGISTRY,
  tracks: CONTENT_TRACK_REGISTRY,
  difficulties: CONTENT_DIFFICULTY_REGISTRY,
} as const;
