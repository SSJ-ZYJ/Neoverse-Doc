import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContentManifestEntry } from '@/content/generated/manifest';
import type { ContentGraph } from '@/content/graph';
import type { ContentIrEntry } from '@/content/ir';
import { CONTENT_TAXONOMY } from '@/content/taxonomy';
import { createExploreProjection } from './explore';
import { createLearnProjection, getRecommendedNextSteps } from './learn';
import { createReferenceProjection } from './reference';
import { createSearchMetadataProjection } from './search';
import type { ContentProjectionSources } from './sources';

const manifestEntries: readonly ContentManifestEntry[] = [
  {
    id: 'docs:learning/b',
    locale: 'zh',
    url: '/zh/docs/ch1/b',
    title: 'B',
    slugs: ['ch1', 'b'],
    type: 'guide',
    topics: ['terminal'],
    tracks: ['computer-essentials'],
    difficulty: 'beginner',
  },
  {
    id: 'docs:learning/a',
    locale: 'zh',
    url: '/zh/docs/ch1/a',
    title: 'A',
    slugs: ['ch1', 'a'],
    type: 'concept',
    topics: ['shell'],
    tracks: ['computer-essentials'],
    difficulty: 'beginner',
  },
  {
    id: 'docs:reference/shell',
    locale: 'zh',
    url: '/zh/docs/ch2/shell',
    title: 'Shell reference',
    slugs: ['ch2', 'shell'],
    type: 'reference',
    topics: ['shell', 'terminal'],
  },
];

const irEntries: readonly ContentIrEntry[] = manifestEntries.map((entry) => ({
  ...entry,
  sourcePath: entry.url,
  mermaid: [],
}));

const graph: ContentGraph = {
  getContentNode() {
    return;
  },
  getPrerequisites(id) {
    return id === 'docs:learning/b' ? ['docs:learning/a'] : [];
  },
  getRequiredBy(id) {
    return id === 'docs:learning/a' ? ['docs:learning/b'] : [];
  },
  getRelated() {
    return [];
  },
  getRelatedBy() {
    return [];
  },
};

const sources: ContentProjectionSources = {
  ir: irEntries,
  manifest: manifestEntries,
  taxonomy: CONTENT_TAXONOMY,
  graph,
};

describe('content product projections', () => {
  it('orders track steps by prerequisites while retaining cross-page stable IDs', () => {
    const learn = createLearnProjection('zh', sources);
    const [track] = learn.tracks;

    assert.equal(track?.trackId, 'computer-essentials');
    assert.deepEqual(
      track?.steps.map((step) => step.contentId),
      ['docs:learning/a', 'docs:learning/b'],
    );
    assert.deepEqual(track?.steps[1]?.prerequisiteIds, ['docs:learning/a']);
    assert.deepEqual(
      getRecommendedNextSteps(learn, new Set(['docs:learning/a'])).map((step) => step.contentId),
      ['docs:learning/b'],
    );
  });

  it('groups Explore data by explicit Topic instead of Chapter', () => {
    const explore = createExploreProjection('zh', sources);

    assert.deepEqual(explore.topics, [
      {
        topicId: 'shell',
        contentIds: ['docs:learning/a', 'docs:reference/shell'],
      },
      {
        topicId: 'terminal',
        contentIds: ['docs:learning/b', 'docs:reference/shell'],
      },
    ]);
  });

  it('selects Reference entries by canonical content type without copying metadata', () => {
    assert.deepEqual(createReferenceProjection('zh', sources), {
      locale: 'zh',
      contentIds: ['docs:reference/shell'],
    });
  });

  it('creates Search metadata from stable IDs while keeping Chapter scope distinct', () => {
    assert.deepEqual(createSearchMetadataProjection(sources)[0], {
      searchPageId: 'docs:learning/b:zh',
      contentId: 'docs:learning/b',
      locale: 'zh',
      chapterScope: 'ch1',
      contentType: 'guide',
      topics: ['terminal'],
      tracks: ['computer-essentials'],
      difficulty: 'beginner',
    });
  });
});
