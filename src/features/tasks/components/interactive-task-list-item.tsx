/**
 * Client boundary for one legacy Markdown task item. Its label hash remains
 * only for backwards-compatible GFM state; explicit Learning Tasks use the
 * stable Lab/Task identity and a separate storage schema.
 *
 * 单个旧版 Markdown 任务项的客户端边界。文本 Hash 仅用于兼容既有 GFM 状态；
 * 显式 Learning Task 使用稳定的 Lab/Task 身份与独立存储 Schema。
 */
'use client';

import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { getPageDictionary } from '@/dictionaries';
import { resolveLocale } from '@/lib/i18n';
import { useContentId } from '@/runtime/content-id';
import {
  getLegacyContentStorageKey,
  getLegacyPathStorageKey,
  migrateLegacyPathStateToContentState,
  readLegacyBooleanState,
  writeLegacyBooleanState,
} from '../runtime/legacy-storage';
import { publishTaskStateChange } from '../runtime/store';
import { TaskItemControl } from './task-item-control';

interface InteractiveTaskListItemProps {
  children: ReactNode;
  className?: string;
  initialChecked: boolean;
  taskLabel: string;
}

function hashTaskLabel(label: string): string {
  let hash = 2166136261;

  for (let index = 0; index < label.length; index += 1) {
    hash ^= label.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

export function InteractiveTaskListItem({
  children,
  className,
  initialChecked,
  taskLabel,
}: InteractiveTaskListItemProps) {
  const pathname = usePathname();
  const contentId = useContentId();
  const { locale } = useI18n();
  const copy = getPageDictionary(resolveLocale(locale));
  const normalizedLabel = taskLabel || copy.taskListItem;
  const legacyPathnameKey = getLegacyPathStorageKey(pathname);
  const storageKey = contentId ? getLegacyContentStorageKey(contentId) : legacyPathnameKey;
  const taskKey = hashTaskLabel(normalizedLabel);
  const [checked, setChecked] = useState(initialChecked);

  // Migrate only validated legacy payloads, and keep the source when a
  // destination write cannot be verified. This preserves old local progress
  // without pretending a text hash is a new Learning Task identity.
  // 仅迁移通过校验的旧数据，并在目标写入无法验证时保留来源，避免丢失旧进度；
  // 同时不把文本 Hash 冒充为新的 Learning Task 身份。
  useEffect(() => {
    if (!contentId) return;
    migrateLegacyPathStateToContentState(pathname, contentId);
  }, [contentId, pathname]);

  useEffect(() => {
    const storedState = readLegacyBooleanState(storageKey);
    setChecked(
      Object.hasOwn(storedState, taskKey) ? Boolean(storedState[taskKey]) : initialChecked,
    );
  }, [initialChecked, storageKey, taskKey]);

  useEffect(() => {
    void checked;
    publishTaskStateChange();
  }, [checked]);

  function handleCheckedChange(nextChecked: boolean) {
    setChecked(nextChecked);
    const storedState = readLegacyBooleanState(storageKey);
    writeLegacyBooleanState(storageKey, {
      ...storedState,
      [taskKey]: nextChecked,
    });
    publishTaskStateChange();
  }

  return (
    <TaskItemControl
      checked={checked}
      className={className}
      onCheckedChange={handleCheckedChange}
      taskLabel={normalizedLabel}
    >
      {children}
    </TaskItemControl>
  );
}
