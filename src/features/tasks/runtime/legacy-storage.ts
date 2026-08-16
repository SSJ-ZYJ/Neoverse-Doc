export const LEGACY_TASK_STORAGE_PREFIX = 'neoverse-mdx-task-state:v1';
export const LEGACY_CONTENT_TASK_STORAGE_PREFIX = 'neoverse-mdx-task-state:v2';

interface ParsedBooleanState {
  readonly state: Record<string, boolean>;
  readonly valid: boolean;
}

export function getLegacyPathStorageKey(pathname: string): string {
  return `${LEGACY_TASK_STORAGE_PREFIX}:${pathname}`;
}

export function getLegacyContentStorageKey(contentId: string): string {
  return `${LEGACY_CONTENT_TASK_STORAGE_PREFIX}:${contentId}`;
}

function parseBooleanState(raw: string | null): ParsedBooleanState {
  if (raw === null) return { state: {}, valid: true };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { state: {}, valid: false };
    }

    const entries = Object.entries(parsed);
    if (entries.some(([, value]) => typeof value !== 'boolean')) {
      return { state: {}, valid: false };
    }

    return { state: Object.fromEntries(entries), valid: true };
  } catch {
    return { state: {}, valid: false };
  }
}

export function readLegacyBooleanState(storageKey: string): Record<string, boolean> {
  try {
    return parseBooleanState(localStorage.getItem(storageKey)).state;
  } catch {
    return {};
  }
}

export function writeLegacyBooleanState(
  storageKey: string,
  state: Record<string, boolean>,
): boolean {
  try {
    const existing = parseBooleanState(localStorage.getItem(storageKey));
    if (!existing.valid) return false;
    localStorage.setItem(storageKey, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/**
 * Merge one pathname bucket into the stable Content ID bucket without losing
 * either side. Destination entries win on the rare hash collision; the source
 * is removed only after a successful, valid write.
 *
 * 将一个 pathname 分桶安全合并到稳定 Content ID 分桶，避免丢失任一侧数据。
 * 极少数 Hash 冲突时由目标值优先；只有写入成功且内容有效后才删除来源。
 */
export function migrateLegacyPathStateToContentState(pathname: string, contentId: string): void {
  try {
    const sourceKey = getLegacyPathStorageKey(pathname);
    const destinationKey = getLegacyContentStorageKey(contentId);
    const sourceRaw = localStorage.getItem(sourceKey);
    if (sourceRaw === null) return;

    const source = parseBooleanState(sourceRaw);
    if (!source.valid) return;

    const destinationRaw = localStorage.getItem(destinationKey);
    const destination = parseBooleanState(destinationRaw);
    if (!destination.valid) return;

    const merged = { ...source.state, ...destination.state };
    const serialized = JSON.stringify(merged);
    localStorage.setItem(destinationKey, serialized);

    if (localStorage.getItem(destinationKey) === serialized) {
      localStorage.removeItem(sourceKey);
    }
  } catch {
    // Keep both buckets when storage is unavailable or a write cannot be verified.
    // 存储不可用或写入无法验证时保留两个分桶，避免不可逆丢失。
  }
}
