/**
 * Shows a next learning step only after the current page has a complete,
 * reliable Learning Registry snapshot. Candidate ordering is pure and stable.
 *
 * 只有当前页面存在完整且可靠的 Learning Registry 快照时才显示下一学习步骤；
 * 候选排序由纯函数确定，不引入随机或 AI 推荐。
 */

'use client';

import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import type { LearnProjection } from '@/content/projections/learn';
import type { ContentTrack } from '@/content/taxonomy';
import type { Dictionary } from '@/dictionaries';
import {
  getCompletedLearningContentIds,
  getLearningRegistryProgress,
  useLearningActivity,
  useLearningRegistry,
} from '@/features/tasks';
import { TransitionLink } from '@/features/transition';
import { getRecommendedNextStep } from '../runtime/recommendation';

export interface LearnRecommendationView {
  readonly contentId: string;
  readonly title: string;
  readonly href: string;
}

export interface LearnRecommendationConfig {
  readonly candidates: readonly LearnRecommendationView[];
  readonly currentContentId: string;
  readonly currentTrackId?: ContentTrack;
  readonly projection: LearnProjection;
  readonly validContentIds: readonly string[];
}

export function LearningRecommendedNext({
  candidates,
  copy,
  currentContentId,
  currentTrackId,
  projection,
  validContentIds,
}: LearnRecommendationConfig & {
  copy: Dictionary['knowledgeContext'];
}) {
  const registry = useLearningRegistry();
  const activity = useLearningActivity(validContentIds);
  const progress = useMemo(() => getLearningRegistryProgress(registry), [registry]);
  const candidateById = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.contentId, candidate] as const)),
    [candidates],
  );

  if (!activity || !progress || progress.total === 0 || progress.completed !== progress.total) {
    return null;
  }

  const completedContentIds = new Set(getCompletedLearningContentIds(activity.entries));
  completedContentIds.add(currentContentId);
  const nextStep = getRecommendedNextStep(
    projection,
    completedContentIds,
    currentContentId,
    currentTrackId,
  );
  const next = nextStep ? candidateById.get(nextStep.contentId) : undefined;
  if (!next) return null;

  return (
    <section
      aria-labelledby="docs-knowledge-next-title"
      className="docs-knowledge-relations docs-knowledge-relations--next"
    >
      <div className="docs-knowledge-relations__heading">
        <ArrowRight aria-hidden="true" size={18} />
        <h2 id="docs-knowledge-next-title">{copy.recommendedNext}</h2>
      </div>
      <ul className="docs-knowledge-relations__list">
        <li>
          <TransitionLink href={next.href}>
            <span>{next.title}</span>
            <ArrowRight aria-hidden="true" size={16} />
          </TransitionLink>
        </li>
      </ul>
    </section>
  );
}
