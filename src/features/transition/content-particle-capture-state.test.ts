import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { matchesContentParticleCapture } from './content-particle-capture-state';

describe('content particle capture state', () => {
  const page = {} as HTMLElement;
  const current = {
    height: 900,
    page,
    path: '/zh/docs/source',
    scrollX: 0,
    scrollY: 240,
    width: 1440,
  };

  it('reuses an exact capture snapshot', () => {
    assert.equal(matchesContentParticleCapture(current, current), true);
  });

  it('invalidates after navigation, scrolling, resizing, or page replacement', () => {
    assert.equal(matchesContentParticleCapture({ ...current, path: '/zh/docs/other' }, current), false);
    assert.equal(matchesContentParticleCapture({ ...current, scrollY: 241 }, current), false);
    assert.equal(matchesContentParticleCapture({ ...current, width: 1280 }, current), false);
    assert.equal(matchesContentParticleCapture({ ...current, page: {} as HTMLElement }, current), false);
  });
});
