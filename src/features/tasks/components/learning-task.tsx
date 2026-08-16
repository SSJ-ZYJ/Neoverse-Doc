/**
 * Explicit, persistable Learning Task primitive. Its state is keyed by the
 * stable identity tuple Content ID + Lab ID + Task ID, never by display text.
 *
 * 显式、可持久化的 Learning Task 原语。状态由 Content ID + Lab ID + Task ID
 * 组成的稳定身份索引，绝不依赖显示文本。
 */
'use client';

import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { type ReactNode, useEffect, useLayoutEffect, useState } from 'react';
import { getPageDictionary } from '@/dictionaries';
import { resolveLocale } from '@/lib/i18n';
import { useContentId } from '@/runtime/content-id';
import {
  createLearningTaskIdentity,
  isLearningId,
  reportInvalidLearningId,
} from '../runtime/learning-model';
import { useOptionalLearningRegistryStore } from '../runtime/learning-registry';
import {
  getLearningTaskProgress,
  readLearningProgress,
  writeLearningTaskProgress,
} from '../runtime/learning-storage';
import { publishTaskStateChange } from '../runtime/store';
import { useLearningLabId } from './learning-lab';
import { TaskItemControl } from './task-item-control';
import { normalizeTaskLabel } from './task-label';

export function Task({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id: string;
}) {
  const { locale } = useI18n();
  const copy = getPageDictionary(resolveLocale(locale));
  const contentId = useContentId();
  const labId = useLearningLabId();
  const store = useOptionalLearningRegistryStore();
  const validTaskId = isLearningId(id);
  const taskLabel = normalizeTaskLabel(children, copy.taskListItem);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (labId && validTaskId) return;
    if (!validTaskId) reportInvalidLearningId('Task', id);
    else if (process.env.NODE_ENV !== 'production') {
      console.error('[Learning] Task must be nested inside a Lab.');
    }
  }, [id, labId, validTaskId]);

  // The initial render stays deterministic for hydration; browser storage is
  // read after mount and then reflected into both the control and Registry.
  // 初次渲染保持确定性以避免 hydration 差异；挂载后读取浏览器存储，再同步到
  // 控件与 Registry。
  useEffect(() => {
    if (!contentId || !labId || !validTaskId) return;
    const storedState = readLearningProgress(contentId);
    setChecked(getLearningTaskProgress(storedState, labId, id) ?? false);
  }, [contentId, id, labId, validTaskId]);

  useLayoutEffect(() => {
    if (!store || !labId || !validTaskId) return;
    return store.registerTask(labId, id, false);
  }, [id, labId, store, validTaskId]);

  useEffect(() => {
    if (!store || !labId || !validTaskId) return;
    store.updateTask(labId, id, checked);
  }, [checked, id, labId, store, validTaskId]);

  function handleCheckedChange(nextChecked: boolean) {
    setChecked(nextChecked);
    if (contentId && labId && validTaskId) {
      const identity = createLearningTaskIdentity(contentId, labId, id);
      writeLearningTaskProgress(identity.contentId, identity.labId, identity.taskId, nextChecked);
      store?.updateTask(identity.labId, identity.taskId, nextChecked);
    }
    publishTaskStateChange();
  }

  return (
    <TaskItemControl
      checked={checked}
      className={['mdx-learning-task-item', className].filter(Boolean).join(' ')}
      onCheckedChange={handleCheckedChange}
      taskLabel={taskLabel}
    >
      {children}
    </TaskItemControl>
  );
}
