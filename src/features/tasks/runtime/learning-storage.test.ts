import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  createLearningProgressState,
  getLearningTaskProgress,
  parseLearningProgress,
  serializeLearningProgress,
  setLearningTaskProgress,
} from './learning-storage';
import {
  getLegacyContentStorageKey,
  getLegacyPathStorageKey,
  migrateLegacyPathStateToContentState,
} from './legacy-storage';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const originalLocalStorage = globalThis.localStorage;

afterEach(() => {
  if (originalLocalStorage) {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: originalLocalStorage,
    });
  } else {
    delete (globalThis as { localStorage?: Storage }).localStorage;
  }
});

describe('learning progress storage', () => {
  it('parses versioned stable entries and updates one identity', () => {
    const contentId = 'docs:git-basics';
    const initial = createLearningProgressState(contentId);
    const next = setLearningTaskProgress(initial, 'git-basics', 'install-git', true);
    const parsed = parseLearningProgress(serializeLearningProgress(next), contentId);

    assert.equal(parsed.valid, true);
    assert.equal(getLearningTaskProgress(parsed.state, 'git-basics', 'install-git'), true);
    assert.equal(
      getLearningTaskProgress(parsed.state, 'git-basics', 'first-repository'),
      undefined,
    );
  });

  it('rejects malformed or duplicate stable entries without partial writes', () => {
    const raw = JSON.stringify({
      version: 1,
      contentId: 'docs:git-basics',
      entries: [
        { labId: 'git-basics', taskId: 'install-git', kind: 'task', completed: true },
        { labId: 'git-basics', taskId: 'install-git', kind: 'task', completed: false },
      ],
    });

    const parsed = parseLearningProgress(raw, 'docs:git-basics');
    assert.equal(parsed.valid, false);
    assert.deepEqual(parsed.state.entries, []);
  });
});

describe('legacy task migration', () => {
  it('merges pathname data into the Content ID bucket and removes only the verified source', () => {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    });
    const pathname = '/zh/docs/git-basics';
    const contentId = 'docs:git-basics';
    storage.setItem(getLegacyPathStorageKey(pathname), JSON.stringify({ first: true }));
    storage.setItem(getLegacyContentStorageKey(contentId), JSON.stringify({ second: false }));

    migrateLegacyPathStateToContentState(pathname, contentId);

    assert.deepEqual(JSON.parse(storage.getItem(getLegacyContentStorageKey(contentId)) ?? ''), {
      first: true,
      second: false,
    });
    assert.equal(storage.getItem(getLegacyPathStorageKey(pathname)), null);
  });

  it('keeps an invalid source payload for safe degradation', () => {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    });
    const pathname = '/zh/docs/git-basics';
    const contentId = 'docs:git-basics';
    const invalidPayload = '{not-json';
    storage.setItem(getLegacyPathStorageKey(pathname), invalidPayload);

    migrateLegacyPathStateToContentState(pathname, contentId);

    assert.equal(storage.getItem(getLegacyPathStorageKey(pathname)), invalidPayload);
    assert.equal(storage.getItem(getLegacyContentStorageKey(contentId)), null);
  });
});
