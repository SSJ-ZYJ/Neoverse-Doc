/**
 * Records one page activation and keeps its compact Registry progress snapshot
 * synchronized. It renders no DOM and never observes the document body.
 *
 * 记录一次页面激活并同步紧凑的 Registry 进度快照。组件不渲染 DOM，
 * 也不观察正文 DOM。
 */

'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { ContentTrack } from '@/content/taxonomy';
import {
  getLearningRegistryProgress,
  recordLearningActivity,
  updateLearningActivityProgress,
} from '../runtime/learning-activity';
import { useLearningRegistry } from '../runtime/learning-registry';

export function ContinueLearningTracker({
  contentId,
  trackId,
}: {
  contentId: string;
  trackId?: ContentTrack;
}) {
  const registry = useLearningRegistry();
  const progress = useMemo(() => getLearningRegistryProgress(registry), [registry]);
  const recordedPageRef = useRef<string | null>(null);
  const pageKey = `${contentId}\u0000${trackId ?? ''}`;

  useEffect(() => {
    if (recordedPageRef.current === pageKey) return;
    recordLearningActivity({ contentId, trackId, progress });
    recordedPageRef.current = pageKey;
  }, [contentId, pageKey, progress, trackId]);

  useEffect(() => {
    updateLearningActivityProgress(contentId, progress);
  }, [contentId, progress]);

  return null;
}
