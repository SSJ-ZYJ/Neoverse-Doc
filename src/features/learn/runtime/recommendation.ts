import type { LearnProjection, LearnStepProjection } from '@/content/projections/learn';
import type { ContentTrack } from '@/content/taxonomy';

function isReadyStep(
  step: LearnStepProjection,
  completedContentIds: ReadonlySet<string>,
  currentContentId: string,
): boolean {
  return (
    step.contentId !== currentContentId &&
    !completedContentIds.has(step.contentId) &&
    step.prerequisiteIds.every((prerequisiteId) => completedContentIds.has(prerequisiteId))
  );
}

/**
 * Chooses one deterministic next step. The current Track is preferred, then
 * the remaining projection order; prerequisite readiness comes from the
 * Knowledge Graph fields carried by Learn Projection.
 *
 * 选择一个确定性的下一步骤。优先当前 Track，再按其余投影顺序扫描；是否
 * 可开始由 Learn Projection 携带的 Knowledge Graph 前置关系决定。
 */
export function getRecommendedNextStep(
  projection: LearnProjection,
  completedContentIds: ReadonlySet<string>,
  currentContentId: string,
  currentTrackId?: ContentTrack,
): LearnStepProjection | undefined {
  const preferredTracks = projection.tracks.filter(
    (track) =>
      track.trackId === currentTrackId ||
      track.steps.some((step) => step.contentId === currentContentId),
  );
  const remainingTracks = projection.tracks.filter(
    (track) => !preferredTracks.some((preferred) => preferred.trackId === track.trackId),
  );

  for (const track of preferredTracks) {
    const currentIndex = track.steps.findIndex((step) => step.contentId === currentContentId);
    if (currentIndex < 0) continue;
    const next = track.steps
      .slice(currentIndex + 1)
      .find((step) => isReadyStep(step, completedContentIds, currentContentId));
    if (next) return next;
  }

  for (const track of [...preferredTracks, ...remainingTracks]) {
    const next = track.steps.find((step) =>
      isReadyStep(step, completedContentIds, currentContentId),
    );
    if (next) return next;
  }

  return undefined;
}
