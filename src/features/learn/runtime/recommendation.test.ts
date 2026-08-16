import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LearnProjection } from '@/content/projections/learn';
import { getRecommendedNextStep } from './recommendation';

const projection: LearnProjection = {
  locale: 'zh',
  tracks: [
    {
      trackId: 'computer-essentials',
      steps: [
        { contentId: 'docs:a', prerequisiteIds: [], requiredByIds: ['docs:b'] },
        { contentId: 'docs:b', prerequisiteIds: ['docs:a'], requiredByIds: ['docs:c'] },
        { contentId: 'docs:c', prerequisiteIds: ['docs:b'], requiredByIds: [] },
      ],
    },
  ],
};

describe('continue learning recommendation', () => {
  it('chooses the next ready step after the completed current step', () => {
    const next = getRecommendedNextStep(
      projection,
      new Set(['docs:a']),
      'docs:a',
      'computer-essentials',
    );
    assert.equal(next?.contentId, 'docs:b');
  });

  it('does not skip an unmet graph prerequisite', () => {
    const next = getRecommendedNextStep(
      projection,
      new Set(['docs:a']),
      'docs:a',
      'computer-essentials',
    );
    assert.notEqual(next?.contentId, 'docs:c');
  });

  it('returns no recommendation when every projected step is complete', () => {
    assert.equal(
      getRecommendedNextStep(
        projection,
        new Set(['docs:a', 'docs:b', 'docs:c']),
        'docs:c',
        'computer-essentials',
      ),
      undefined,
    );
  });
});
