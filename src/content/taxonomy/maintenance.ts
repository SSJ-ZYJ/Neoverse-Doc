import type { ContentType } from './content-types';
import type { ContentTopic } from './topics';

export const FRESHNESS_POLICY_IDS = ['fast-moving', 'normal', 'stable'] as const;

export type FreshnessPolicyId = (typeof FRESHNESS_POLICY_IDS)[number];

export const FRESHNESS_POLICIES = {
  'fast-moving': { reviewIntervalDays: 90 },
  normal: { reviewIntervalDays: 365 },
  stable: { reviewIntervalDays: 730 },
} as const satisfies Record<FreshnessPolicyId, { reviewIntervalDays: number }>;

// The taxonomy registry is the only place where content IDs acquire a review
// cadence. 内容分类 ID 的复核周期只在此注册表中赋予，避免组件各自维护策略。
const CONTENT_TYPE_FRESHNESS = {
  concept: 'stable',
  guide: 'normal',
  reference: 'fast-moving',
} as const satisfies Record<ContentType, FreshnessPolicyId>;

const CONTENT_TOPIC_FRESHNESS = {
  architecture: 'stable',
  'operating-system': 'normal',
  shell: 'fast-moving',
  terminal: 'fast-moving',
  'text-editing': 'normal',
} as const satisfies Record<ContentTopic, FreshnessPolicyId>;

export interface FreshnessPolicy {
  readonly id: FreshnessPolicyId;
  readonly reviewIntervalDays: number;
}

function shorterPolicy(left: FreshnessPolicyId, right: FreshnessPolicyId): FreshnessPolicyId {
  return FRESHNESS_POLICIES[left].reviewIntervalDays <= FRESHNESS_POLICIES[right].reviewIntervalDays
    ? left
    : right;
}

/**
 * Resolve the shortest applicable interval. A fast-moving topic therefore
 * cannot be hidden by a slower page type; unclassified content uses stable.
 * 解析所有命中的策略并取最短周期，因此快速变化 Topic 不会被较慢的类型
 * 策略覆盖；没有分类的内容使用 stable。
 */
export function resolveFreshnessPolicy(entry: {
  readonly type?: ContentType;
  readonly topics?: readonly ContentTopic[];
}): FreshnessPolicy {
  let policyId: FreshnessPolicyId = 'stable';

  if (entry.type !== undefined) {
    policyId = shorterPolicy(policyId, CONTENT_TYPE_FRESHNESS[entry.type]);
  }

  for (const topic of entry.topics ?? []) {
    policyId = shorterPolicy(policyId, CONTENT_TOPIC_FRESHNESS[topic]);
  }

  return {
    id: policyId,
    reviewIntervalDays: FRESHNESS_POLICIES[policyId].reviewIntervalDays,
  };
}
