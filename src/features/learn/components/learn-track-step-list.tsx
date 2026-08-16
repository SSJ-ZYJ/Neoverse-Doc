/**
 * Client island for the Track step list. The step content remains server
 * derived; only local activity status is hydrated on the browser.
 *
 * Track 步骤列表的客户端岛。步骤内容仍由服务端派生，浏览器只负责恢复
 * 本地活动状态。
 */

'use client';

import { CheckCircle2, Clock3, GitBranch } from 'lucide-react';
import { useMemo } from 'react';
import type { Dictionary } from '@/dictionaries';
import { useLearningActivity } from '@/features/tasks';
import { TransitionLink } from '@/features/transition';
import type { LearnPrerequisiteView, LearnStepView } from './learn-pages';

type LearnCopy = Dictionary['learn'];

function fillProgressLabel(template: string, completed: number, total: number): string {
  return template.replace('{completed}', String(completed)).replace('{total}', String(total));
}

export function LearnTrackStepList({
  copy,
  steps,
  validContentIds,
}: {
  copy: LearnCopy;
  steps: readonly LearnStepView[];
  validContentIds: readonly string[];
}) {
  const activity = useLearningActivity(validContentIds);
  const activityByContentId = useMemo(
    () => new Map(activity?.entries.map((entry) => [entry.contentId, entry] as const)),
    [activity],
  );
  const latestActivity = activity?.entries[0];

  return (
    <ol className="learn-step-list">
      {steps.map((step) => {
        const entry = activityByContentId.get(step.contentId);
        const progress = entry?.progress;
        const hasReliableProgress = progress !== undefined && progress.total > 0;
        const isCurrent = hasReliableProgress && latestActivity?.contentId === step.contentId;
        const isCompleted = hasReliableProgress && progress.completed === progress.total;

        return (
          <li className="learn-step" key={step.contentId}>
            <span aria-hidden="true" className="learn-step__number">
              {String(step.number).padStart(2, '0')}
            </span>
            <div className="learn-step__body">
              <div className="learn-step__heading">
                <TransitionLink href={step.href}>
                  <h3>{step.title}</h3>
                </TransitionLink>
                {step.status === 'review' && (
                  <span className="metadata-chip metadata-chip--status">{copy.reviewBadge}</span>
                )}
                {isCurrent && (
                  <span className="metadata-chip metadata-chip--track">
                    {copy.currentLearningPosition}
                  </span>
                )}
                {isCompleted && (
                  <span className="metadata-chip metadata-chip--status">{copy.completed}</span>
                )}
                {hasReliableProgress && !isCompleted && (
                  <span className="metadata-chip metadata-chip--status">{copy.inProgress}</span>
                )}
              </div>
              {step.description && <p className="learn-step__description">{step.description}</p>}
              {step.estimatedMinutes !== undefined && (
                <span className="learn-step__duration">
                  <Clock3 aria-hidden="true" size={15} />
                  {step.estimatedMinutes} {copy.minutes}
                </span>
              )}
              {hasReliableProgress && (
                <p className="learn-step__progress">
                  {fillProgressLabel(copy.taskProgress, progress.completed, progress.total)}
                </p>
              )}
              <LearnPrerequisites copy={copy} prerequisites={step.prerequisites} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function LearnPrerequisites({
  copy,
  prerequisites,
}: {
  copy: LearnCopy;
  prerequisites: readonly LearnPrerequisiteView[];
}) {
  if (prerequisites.length === 0) {
    return (
      <p className="learn-step__prerequisites learn-step__prerequisites--empty">
        <CheckCircle2 aria-hidden="true" size={15} />
        {copy.noPrerequisites}
      </p>
    );
  }

  return (
    <div className="learn-step__prerequisites">
      <p className="learn-step__prerequisites-label">
        <GitBranch aria-hidden="true" size={15} />
        {copy.prerequisitesLabel}
      </p>
      <ul>
        {prerequisites.map((prerequisite) => (
          <li key={prerequisite.id}>
            <span className="learn-prerequisite__scope">
              {prerequisite.isInTrack ? copy.orderLabel : copy.outsideTrackPrerequisite}
            </span>
            {prerequisite.href ? (
              <TransitionLink href={prerequisite.href}>{prerequisite.title}</TransitionLink>
            ) : (
              <span>{prerequisite.title}</span>
            )}
            {prerequisite.replacement && (
              <span className="learn-prerequisite__replacement">
                {copy.replacedBy}{' '}
                <TransitionLink href={prerequisite.replacement.href}>
                  {prerequisite.replacement.title}
                </TransitionLink>
              </span>
            )}
            {!prerequisite.href && !prerequisite.replacement && (
              <span className="learn-prerequisite__unavailable">
                {copy.prerequisiteUnavailable}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
