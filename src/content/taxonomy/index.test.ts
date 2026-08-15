import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CONTENT_DIFFICULTY_IDS,
  CONTENT_TAXONOMY,
  CONTENT_TOPIC_IDS,
  CONTENT_TRACK_IDS,
  CONTENT_TYPE_IDS,
  getTaxonomyEntry,
  getTaxonomyLabel,
} from './index';

describe('content taxonomy', () => {
  it('derives every legal ID from the canonical registries', () => {
    assert.deepEqual(CONTENT_TYPE_IDS, ['concept', 'guide', 'reference']);
    assert.deepEqual(CONTENT_TOPIC_IDS, [
      'architecture',
      'operating-system',
      'shell',
      'terminal',
      'text-editing',
    ]);
    assert.deepEqual(CONTENT_TRACK_IDS, ['computer-essentials']);
    assert.deepEqual(CONTENT_DIFFICULTY_IDS, ['beginner', 'intermediate', 'advanced']);
  });

  it('provides localized display data without a second mapping', () => {
    const track = getTaxonomyEntry(CONTENT_TAXONOMY.tracks, 'computer-essentials');
    assert.ok(track);
    assert.equal(getTaxonomyLabel(track, 'zh'), '计算机基础');
    assert.equal(getTaxonomyLabel(track, 'en'), 'Computer Essentials');
    assert.equal(track.order, 10);
    assert.ok(track.description);
  });
});
