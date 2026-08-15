import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compileContentGraph } from './compiler';
import type { ContentRelationEntry } from './types';

const entries: ContentRelationEntry[] = [
  {
    id: 'docs:alpha',
    locale: 'zh',
    prerequisites: ['docs:beta'],
    related: ['docs:gamma'],
  },
  {
    id: 'docs:alpha',
    locale: 'en',
  },
  {
    id: 'docs:beta',
    locale: 'zh',
  },
  {
    id: 'docs:gamma',
    locale: 'zh',
  },
];

describe('content graph compiler', () => {
  it('compiles locale variants into one Stable Content ID node', () => {
    const graph = compileContentGraph(entries);

    assert.deepEqual(graph.getPrerequisites('docs:alpha'), ['docs:beta']);
    assert.deepEqual(graph.getRequiredBy('docs:beta'), ['docs:alpha']);
    assert.deepEqual(graph.getRelated('docs:alpha'), ['docs:gamma']);
    assert.deepEqual(graph.getRelated('docs:gamma'), []);
    assert.deepEqual(graph.getRelatedBy('docs:gamma'), ['docs:alpha']);
    assert.deepEqual(graph.getContentNode('docs:alpha'), {
      id: 'docs:alpha',
      prerequisites: ['docs:beta'],
      requiredBy: [],
      related: ['docs:gamma'],
      relatedBy: [],
    });
  });

  it('keeps unknown IDs outside the graph node set', () => {
    const graph = compileContentGraph([
      {
        id: 'docs:alpha',
        locale: 'zh',
        prerequisites: ['docs:missing'],
      },
    ]);

    assert.equal(graph.getContentNode('docs:missing'), undefined);
    assert.deepEqual(graph.getPrerequisites('docs:alpha'), ['docs:missing']);
  });
});
