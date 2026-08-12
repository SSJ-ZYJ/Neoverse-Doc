import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getTaskStateRevision, publishTaskStateChange, subscribeTaskState } from './store';

describe('task state store', () => {
  it('notifies subscribers and stops after unsubscribe', () => {
    let calls = 0;
    const before = getTaskStateRevision();
    const unsubscribe = subscribeTaskState(() => {
      calls += 1;
    });

    publishTaskStateChange();
    assert.equal(getTaskStateRevision(), before + 1);
    assert.equal(calls, 1);

    unsubscribe();
    publishTaskStateChange();
    assert.equal(calls, 1);
  });
});
