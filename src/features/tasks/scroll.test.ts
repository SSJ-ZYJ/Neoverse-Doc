import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getTaskListScrollDuration, getTaskListScrollProgress } from './scroll';

describe('task-list scroll timing', () => {
  test('keeps long document jumps deliberately paced', () => {
    assert.equal(getTaskListScrollDuration(0), 0);
    assert.equal(getTaskListScrollDuration(3_200), 720);
    assert.equal(getTaskListScrollDuration(8_000), 1_200);
    assert.equal(getTaskListScrollDuration(16_000), 2_000);
    assert.equal(getTaskListScrollDuration(20_000), 2_400);
  });

  test('uses a symmetric ease-in-out curve without linear phase changes', () => {
    assert.equal(getTaskListScrollProgress(0), 0);
    assert.ok(Math.abs(getTaskListScrollProgress(0.25) - 0.146_447) < 0.000_001);
    assert.ok(Math.abs(getTaskListScrollProgress(0.5) - 0.5) < Number.EPSILON);
    assert.ok(Math.abs(getTaskListScrollProgress(0.75) - 0.853_553) < 0.000_001);
    assert.equal(getTaskListScrollProgress(1), 1);
  });
});
