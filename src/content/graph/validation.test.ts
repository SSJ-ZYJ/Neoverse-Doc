import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContentRelationEntry } from './types';
import { validateContentRelations } from './validation';

describe('content relation validation', () => {
  it('keeps duplicate, self-reference, and missing-target checks', () => {
    const issues = validateContentRelations([
      {
        id: 'docs:alpha',
        locale: 'zh',
        prerequisites: ['docs:alpha', 'docs:beta', 'docs:beta', 'docs:missing'],
      },
      {
        id: 'docs:beta',
        locale: 'zh',
      },
    ]);

    assert.ok(issues.some((issue) => issue.message.includes('自引用')));
    assert.ok(issues.some((issue) => issue.message.includes('重复引用')));
    assert.ok(issues.some((issue) => issue.message.includes('不存在的 Content ID')));
  });

  it('allows incomplete localization but rejects contradictory declarations', () => {
    const incomplete: ContentRelationEntry[] = [
      { id: 'docs:alpha', locale: 'zh', related: ['docs:beta'] },
      { id: 'docs:alpha', locale: 'en' },
      { id: 'docs:beta', locale: 'zh' },
    ];
    assert.equal(
      validateContentRelations(incomplete).some((issue) => issue.message.includes('声明不一致')),
      false,
    );

    const contradictory: ContentRelationEntry[] = [
      { id: 'docs:alpha', locale: 'zh', related: ['docs:beta'] },
      { id: 'docs:alpha', locale: 'en', related: ['docs:gamma'] },
      { id: 'docs:beta', locale: 'zh' },
      { id: 'docs:gamma', locale: 'zh' },
    ];
    assert.ok(
      validateContentRelations(contradictory).some(
        (issue) =>
          issue.field === 'related' &&
          issue.identity === 'docs:alpha' &&
          issue.message.includes('声明不一致'),
      ),
    );
  });

  it('reports the Stable Content ID chain for prerequisite cycles', () => {
    const issues = validateContentRelations([
      { id: 'docs:alpha', locale: 'zh', prerequisites: ['docs:beta'] },
      { id: 'docs:beta', locale: 'zh', prerequisites: ['docs:gamma'] },
      { id: 'docs:gamma', locale: 'zh', prerequisites: ['docs:alpha'] },
    ]);

    assert.ok(
      issues.some(
        (issue) =>
          issue.field === 'prerequisites' &&
          issue.message === '前置关系形成环：docs:alpha → docs:beta → docs:gamma → docs:alpha',
      ),
    );
  });
});
