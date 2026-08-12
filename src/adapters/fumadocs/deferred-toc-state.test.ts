import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { advanceDeferredTocState } from './deferred-toc-state';

describe('deferred TOC state', () => {
  it('retains the previous outline until the destination outline is ready', () => {
    const source = { path: '/source', phase: 'visible' as const, toc: ['source'] };
    const leaving = advanceDeferredTocState(source, 'leaving', '/source', ['source']);
    const entering = advanceDeferredTocState(leaving, 'entering', '/target', ['target']);

    assert.deepEqual(leaving, { ...source, phase: 'retained' });
    assert.deepEqual(entering, { path: '/target', phase: 'visible', toc: ['target'] });
    assert.notEqual(leaving.toc.length, 0);
    assert.notEqual(entering.toc.length, 0);
  });
});
