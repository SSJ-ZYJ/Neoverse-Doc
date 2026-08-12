import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  finishNavigation,
  getNavigationSnapshot,
  setNavigationPhase,
  subscribeNavigation,
} from './store';

describe('navigation runtime', () => {
  it('publishes the complete navigation lifecycle', () => {
    const phases: string[] = [];
    const intent = { kind: 'content', sourcePath: '/a', targetPath: '/b' };
    const unsubscribe = subscribeNavigation(() => phases.push(getNavigationSnapshot().phase));

    setNavigationPhase('capturing', intent);
    setNavigationPhase('leaving', intent);
    setNavigationPhase('entering', intent);
    finishNavigation();
    unsubscribe();

    assert.deepEqual(phases, ['capturing', 'leaving', 'entering', 'idle']);
    assert.deepEqual(getNavigationSnapshot(), { phase: 'idle' });
  });
});
