import { isLearningId } from './learning-model';

export const LEARNING_STORAGE_PREFIX = 'neoverse-learning-state:v1';
export const LEARNING_STORAGE_VERSION = 1;

export interface LearningProgressEntry {
  readonly labId: string;
  readonly taskId: string;
  readonly kind: 'task';
  readonly completed: boolean;
}

export interface LearningProgressState {
  readonly version: typeof LEARNING_STORAGE_VERSION;
  readonly contentId: string;
  readonly entries: readonly LearningProgressEntry[];
}

interface ParsedLearningProgress {
  readonly state: LearningProgressState;
  readonly valid: boolean;
}

export function getLearningStorageKey(contentId: string): string {
  return `${LEARNING_STORAGE_PREFIX}:${contentId}`;
}

export function createLearningProgressState(contentId: string): LearningProgressState {
  return {
    version: LEARNING_STORAGE_VERSION,
    contentId,
    entries: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseEntry(value: unknown): LearningProgressEntry | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.labId !== 'string' ||
    typeof value.taskId !== 'string' ||
    value.kind !== 'task' ||
    typeof value.completed !== 'boolean' ||
    !isLearningId(value.labId) ||
    !isLearningId(value.taskId)
  ) {
    return null;
  }

  return {
    labId: value.labId,
    taskId: value.taskId,
    kind: 'task',
    completed: value.completed,
  };
}

export function parseLearningProgress(
  raw: string | null,
  contentId: string,
): ParsedLearningProgress {
  const empty = createLearningProgressState(contentId);
  if (raw === null) return { state: empty, valid: true };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.version !== LEARNING_STORAGE_VERSION ||
      parsed.contentId !== contentId ||
      !Array.isArray(parsed.entries)
    ) {
      return { state: empty, valid: false };
    }

    const entries: LearningProgressEntry[] = [];
    const identities = new Set<string>();
    for (const value of parsed.entries) {
      const entry = parseEntry(value);
      if (!entry) return { state: empty, valid: false };

      const identity = `${entry.labId}\u0000${entry.taskId}`;
      if (identities.has(identity)) return { state: empty, valid: false };
      identities.add(identity);
      entries.push(entry);
    }

    return {
      state: {
        version: LEARNING_STORAGE_VERSION,
        contentId,
        entries,
      },
      valid: true,
    };
  } catch {
    return { state: empty, valid: false };
  }
}

export function serializeLearningProgress(state: LearningProgressState): string {
  return JSON.stringify({
    version: state.version,
    contentId: state.contentId,
    entries: state.entries,
  });
}

export function getLearningTaskProgress(
  state: LearningProgressState,
  labId: string,
  taskId: string,
): boolean | undefined {
  return state.entries.find((entry) => entry.labId === labId && entry.taskId === taskId)?.completed;
}

export function setLearningTaskProgress(
  state: LearningProgressState,
  labId: string,
  taskId: string,
  completed: boolean,
): LearningProgressState {
  const existingIndex = state.entries.findIndex(
    (entry) => entry.labId === labId && entry.taskId === taskId,
  );
  const entry: LearningProgressEntry = {
    labId,
    taskId,
    kind: 'task',
    completed,
  };

  if (existingIndex < 0) {
    return { ...state, entries: [...state.entries, entry] };
  }

  const entries = [...state.entries];
  entries[existingIndex] = entry;
  return { ...state, entries };
}

export function readLearningProgress(contentId: string): LearningProgressState {
  try {
    const parsed = parseLearningProgress(
      localStorage.getItem(getLearningStorageKey(contentId)),
      contentId,
    );
    return parsed.state;
  } catch {
    return createLearningProgressState(contentId);
  }
}

export function writeLearningTaskProgress(
  contentId: string,
  labId: string,
  taskId: string,
  completed: boolean,
): boolean {
  try {
    const storageKey = getLearningStorageKey(contentId);
    const raw = localStorage.getItem(storageKey);
    const parsed = parseLearningProgress(raw, contentId);
    if (!parsed.valid) return false;

    const nextState = setLearningTaskProgress(parsed.state, labId, taskId, completed);
    localStorage.setItem(storageKey, serializeLearningProgress(nextState));
    return true;
  } catch {
    // Private browsing and disabled storage should degrade to in-memory state.
    // 隐私模式或被禁用的存储应安全降级为仅保留内存状态。
    return false;
  }
}
