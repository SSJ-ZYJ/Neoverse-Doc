import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  createEmptyLearningActivityState,
  getCompletedLearningContentIds,
  LEARNING_ACTIVITY_LIMIT,
  LEARNING_ACTIVITY_STORAGE_KEY,
  parseLearningActivity,
  pruneLearningActivityState,
  readLearningActivity,
  recordLearningActivity,
  serializeLearningActivity,
  updateLearningActivityProgress,
} from './learning-activity';

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

describe('continue learning activity storage', () => {
  it('stores only stable activity fields and updates progress in place', () => {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });

    assert.equal(
      recordLearningActivity({
        contentId: 'docs:learning/shell',
        trackId: 'computer-essentials',
        progress: { completed: 1, total: 5 },
      }),
      true,
    );
    assert.equal(
      updateLearningActivityProgress('docs:learning/shell', { completed: 3, total: 5 }),
      true,
    );

    const raw = storage.getItem(LEARNING_ACTIVITY_STORAGE_KEY) ?? '';
    assert.equal(raw.includes('Shell Basics'), false);
    assert.equal(raw.includes('/zh/docs/'), false);
    assert.deepEqual(readLearningActivity().entries[0]?.progress, { completed: 3, total: 5 });
  });

  it('rejects malformed and old-version payloads while dropping invalid rows', () => {
    const duplicate = JSON.stringify({
      version: 1,
      entries: [
        { contentId: 'docs:a', lastVisitedAt: 1 },
        { contentId: 'docs:a', lastVisitedAt: 2 },
      ],
    });
    assert.equal(parseLearningActivity(duplicate).valid, true);
    assert.deepEqual(parseLearningActivity(duplicate).state.entries, [
      { contentId: 'docs:a', lastVisitedAt: 2 },
    ]);
    assert.deepEqual(parseLearningActivity(JSON.stringify({ version: 0, entries: [] })).state, {
      ...createEmptyLearningActivityState(),
    });
    assert.equal(parseLearningActivity('{not-json').valid, false);
  });

  it('prunes deleted or non-indexable IDs while retaining moved stable IDs and the size cap', () => {
    const entries = Array.from({ length: LEARNING_ACTIVITY_LIMIT + 1 }, (_, index) => ({
      contentId: `docs:page-${index}`,
      lastVisitedAt: index + 1,
    }));
    const state = {
      version: 1 as const,
      entries,
    };
    const pruned = pruneLearningActivityState(
      state,
      new Set([...entries.map((entry) => entry.contentId), 'docs:moved']),
    );

    assert.equal(pruned.entries.length, LEARNING_ACTIVITY_LIMIT);
    assert.equal(pruned.entries[0]?.contentId, 'docs:page-12');
    assert.deepEqual(
      pruneLearningActivityState(
        {
          version: 1,
          entries: [{ contentId: 'docs:moved', lastVisitedAt: 20 }],
        },
        new Set(['docs:moved']),
      ).entries,
      [{ contentId: 'docs:moved', lastVisitedAt: 20 }],
    );
  });

  it('derives completed content from reliable positive task totals only', () => {
    const entries = [
      { contentId: 'docs:complete', lastVisitedAt: 3, progress: { completed: 2, total: 2 } },
      { contentId: 'docs:active', lastVisitedAt: 2, progress: { completed: 1, total: 2 } },
      { contentId: 'docs:no-tasks', lastVisitedAt: 1 },
    ];
    assert.deepEqual([...getCompletedLearningContentIds(entries)], ['docs:complete']);
  });

  it('cleans syntactically valid unknown IDs when read with a Manifest set', () => {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    storage.setItem(
      LEARNING_ACTIVITY_STORAGE_KEY,
      serializeLearningActivity({
        version: 1,
        entries: [
          { contentId: 'docs:current', lastVisitedAt: 20 },
          { contentId: 'docs:deleted', lastVisitedAt: 10 },
        ],
      }),
    );

    assert.deepEqual(
      readLearningActivity(new Set(['docs:current'])).entries.map((entry) => entry.contentId),
      ['docs:current'],
    );
  });
});
