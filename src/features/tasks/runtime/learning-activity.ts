/**
 * Minimal local activity for Continue Learning. The activity record keeps
 * only stable identity, optional taxonomy context, visit time, and a
 * Learning Registry progress snapshot; titles and URLs remain derived data.
 *
 * Continue Learning 的最小本地活动状态。记录只保存稳定身份、可选的分类
 * 上下文、访问时间与 Learning Registry 进度快照；标题和 URL 始终由派生数据提供。
 */

'use client';

import { useEffect, useState } from 'react';
import type { LearningRegistry } from './learning-model';

export const LEARNING_ACTIVITY_STORAGE_KEY = 'neoverse-learning-activity:v1';
export const LEARNING_ACTIVITY_STORAGE_VERSION = 1;
export const LEARNING_ACTIVITY_LIMIT = 12;

const STABLE_CONTENT_ID_PATTERN = /^docs:[A-Za-z0-9][A-Za-z0-9./-]*$/;
const ACTIVITY_EVENT = 'neoverse:learning-activity-change';

export interface LearningActivityProgress {
  readonly completed: number;
  readonly total: number;
}

export interface LearningActivityEntry {
  readonly contentId: string;
  readonly trackId?: string;
  readonly lastVisitedAt: number;
  readonly progress?: LearningActivityProgress;
}

export interface LearningActivityState {
  readonly version: typeof LEARNING_ACTIVITY_STORAGE_VERSION;
  readonly entries: readonly LearningActivityEntry[];
}

export interface RecordLearningActivityInput {
  readonly contentId: string;
  readonly trackId?: string;
  /** Omit to preserve an existing snapshot; pass null to remove it. */
  readonly progress?: LearningActivityProgress | null;
}

interface ParsedLearningActivity {
  readonly state: LearningActivityState;
  readonly valid: boolean;
}

type ActivityListener = () => void;

const listeners = new Set<ActivityListener>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStableContentId(value: unknown): value is string {
  return typeof value === 'string' && STABLE_CONTENT_ID_PATTERN.test(value);
}

function isLearningActivityProgress(value: unknown): value is LearningActivityProgress {
  if (!isRecord(value)) return false;
  const completed = value.completed;
  const total = value.total;
  return (
    typeof completed === 'number' &&
    typeof total === 'number' &&
    Number.isSafeInteger(completed) &&
    Number.isSafeInteger(total) &&
    completed >= 0 &&
    total > 0 &&
    completed <= total
  );
}

function parseEntry(value: unknown): LearningActivityEntry | null {
  if (!isRecord(value)) return null;
  const lastVisitedAt = value.lastVisitedAt;
  if (
    !isStableContentId(value.contentId) ||
    typeof lastVisitedAt !== 'number' ||
    !Number.isSafeInteger(lastVisitedAt) ||
    lastVisitedAt <= 0 ||
    (value.trackId !== undefined &&
      (typeof value.trackId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value.trackId))) ||
    (value.progress !== undefined && !isLearningActivityProgress(value.progress))
  ) {
    return null;
  }

  return {
    contentId: value.contentId,
    ...(value.trackId !== undefined ? { trackId: value.trackId } : {}),
    lastVisitedAt,
    ...(value.progress !== undefined ? { progress: value.progress } : {}),
  };
}

function sortAndLimitEntries(entries: readonly LearningActivityEntry[]): LearningActivityEntry[] {
  return [...entries]
    .sort(
      (left, right) =>
        right.lastVisitedAt - left.lastVisitedAt || left.contentId.localeCompare(right.contentId),
    )
    .slice(0, LEARNING_ACTIVITY_LIMIT);
}

export function createEmptyLearningActivityState(): LearningActivityState {
  return {
    version: LEARNING_ACTIVITY_STORAGE_VERSION,
    entries: [],
  };
}

export function parseLearningActivity(raw: string | null): ParsedLearningActivity {
  const empty = createEmptyLearningActivityState();
  if (raw === null) return { state: empty, valid: true };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.version !== LEARNING_ACTIVITY_STORAGE_VERSION ||
      !Array.isArray(parsed.entries)
    ) {
      return { state: empty, valid: false };
    }

    const entriesByContentId = new Map<string, LearningActivityEntry>();
    for (const value of parsed.entries) {
      const entry = parseEntry(value);
      if (!entry) continue;
      const existing = entriesByContentId.get(entry.contentId);
      if (!existing || entry.lastVisitedAt > existing.lastVisitedAt) {
        entriesByContentId.set(entry.contentId, entry);
      }
    }

    return {
      state: {
        version: LEARNING_ACTIVITY_STORAGE_VERSION,
        entries: sortAndLimitEntries([...entriesByContentId.values()]),
      },
      valid: true,
    };
  } catch {
    return { state: empty, valid: false };
  }
}

export function serializeLearningActivity(state: LearningActivityState): string {
  return JSON.stringify({
    version: state.version,
    entries: state.entries,
  });
}

/**
 * Removes syntactically valid but no longer indexable Content IDs. The
 * caller supplies the current Manifest-derived set, so URL moves remain valid
 * while deleted or non-public content is pruned.
 *
 * 清理语法有效但已不再可索引的 Content ID。调用方传入由当前 Manifest
 * 派生的集合，因此 URL 移动仍然有效，删除或非公开内容会被清理。
 */
export function pruneLearningActivityState(
  state: LearningActivityState,
  validContentIds: ReadonlySet<string>,
): LearningActivityState {
  const entries = sortAndLimitEntries(
    state.entries.filter((entry) => validContentIds.has(entry.contentId)),
  );
  return entries.length === state.entries.length &&
    entries.every((entry, index) => entry === state.entries[index])
    ? state
    : { ...state, entries };
}

function notifyActivityChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ACTIVITY_EVENT));
    return;
  }
  for (const listener of listeners) listener();
}

function writeRawActivityState(state: LearningActivityState): boolean {
  try {
    localStorage.setItem(LEARNING_ACTIVITY_STORAGE_KEY, serializeLearningActivity(state));
    notifyActivityChange();
    return true;
  } catch {
    // Disabled or private storage degrades to no persisted activity.
    // 存储被禁用或处于隐私模式时，安全降级为不持久化活动状态。
    return false;
  }
}

export function readLearningActivity(validContentIds?: ReadonlySet<string>): LearningActivityState {
  try {
    const raw = localStorage.getItem(LEARNING_ACTIVITY_STORAGE_KEY);
    const parsed = parseLearningActivity(raw);
    if (!parsed.valid) {
      localStorage.removeItem(LEARNING_ACTIVITY_STORAGE_KEY);
      return parsed.state;
    }

    const state = validContentIds
      ? pruneLearningActivityState(parsed.state, validContentIds)
      : parsed.state;
    if (raw !== serializeLearningActivity(state)) {
      localStorage.setItem(LEARNING_ACTIVITY_STORAGE_KEY, serializeLearningActivity(state));
    }
    return state;
  } catch {
    return createEmptyLearningActivityState();
  }
}

export function recordLearningActivity(input: RecordLearningActivityInput): boolean {
  if (!isStableContentId(input.contentId)) return false;
  if (input.trackId !== undefined && !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(input.trackId)) {
    return false;
  }
  if (
    input.progress !== undefined &&
    input.progress !== null &&
    !isLearningActivityProgress(input.progress)
  ) {
    return false;
  }

  const state = readLearningActivity();
  const existing = state.entries.find((entry) => entry.contentId === input.contentId);
  const nextEntry: LearningActivityEntry = {
    contentId: input.contentId,
    ...(input.trackId !== undefined
      ? { trackId: input.trackId }
      : existing?.trackId !== undefined
        ? { trackId: existing.trackId }
        : {}),
    lastVisitedAt: Date.now(),
    ...(input.progress !== undefined
      ? input.progress === null
        ? {}
        : { progress: input.progress }
      : existing?.progress !== undefined
        ? { progress: existing.progress }
        : {}),
  };
  const nextState: LearningActivityState = {
    version: LEARNING_ACTIVITY_STORAGE_VERSION,
    entries: sortAndLimitEntries([
      ...state.entries.filter((entry) => entry.contentId !== input.contentId),
      nextEntry,
    ]),
  };
  return writeRawActivityState(nextState);
}

export function updateLearningActivityProgress(
  contentId: string,
  progress: LearningActivityProgress | null,
): boolean {
  if (!isStableContentId(contentId)) return false;
  if (progress !== null && !isLearningActivityProgress(progress)) return false;

  const state = readLearningActivity();
  const existing = state.entries.find((entry) => entry.contentId === contentId);
  if (!existing) {
    return recordLearningActivity({ contentId, progress });
  }

  const nextEntry: LearningActivityEntry = {
    contentId: existing.contentId,
    ...(existing.trackId !== undefined ? { trackId: existing.trackId } : {}),
    lastVisitedAt: existing.lastVisitedAt,
    ...(progress !== null ? { progress } : {}),
  };
  const nextState: LearningActivityState = {
    version: LEARNING_ACTIVITY_STORAGE_VERSION,
    entries: state.entries.map((entry) => (entry.contentId === contentId ? nextEntry : entry)),
  };
  if (serializeLearningActivity(nextState) === serializeLearningActivity(state)) return true;
  return writeRawActivityState(nextState);
}

export function getLearningRegistryProgress(
  registry: LearningRegistry,
): LearningActivityProgress | null {
  const tasks = registry.labs.flatMap((lab) => lab.tasks);
  if (tasks.length === 0) return null;
  return {
    completed: tasks.filter((task) => task.completed).length,
    total: tasks.length,
  };
}

export function getCompletedLearningContentIds(
  entries: readonly LearningActivityEntry[],
): ReadonlySet<string> {
  return new Set(
    entries
      .filter(
        (entry) =>
          entry.progress !== undefined &&
          entry.progress.total > 0 &&
          entry.progress.completed === entry.progress.total,
      )
      .map((entry) => entry.contentId),
  );
}

export function subscribeLearningActivity(listener: ActivityListener): () => void {
  listeners.add(listener);
  if (typeof window === 'undefined') return () => listeners.delete(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === LEARNING_ACTIVITY_STORAGE_KEY) listener();
  };
  const handleActivity = () => listener();
  window.addEventListener('storage', handleStorage);
  window.addEventListener(ACTIVITY_EVENT, handleActivity);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(ACTIVITY_EVENT, handleActivity);
  };
}

export function useLearningActivity(
  validContentIds: readonly string[],
): LearningActivityState | null {
  const [state, setState] = useState<LearningActivityState | null>(null);

  useEffect(() => {
    const validIds = new Set(validContentIds);
    const refresh = () => setState(readLearningActivity(validIds));
    refresh();
    return subscribeLearningActivity(refresh);
  }, [validContentIds]);

  return state;
}
