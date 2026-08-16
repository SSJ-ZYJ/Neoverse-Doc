import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContentManifestEntry } from '@/content/generated/manifest';
import type { ContentGraph } from '@/content/graph';
import type { ContentIrEntry } from '@/content/ir';
import { CONTENT_TAXONOMY } from '@/content/taxonomy';
import { createContinueLearningCatalog } from './continue-learning';
import type { ContentProjectionSources } from './sources';

const manifest: readonly ContentManifestEntry[] = [
  {
    id: 'docs:moved',
    locale: 'zh',
    url: '/zh/docs/new-location',
    title: '新位置',
    slugs: ['new-location'],
    status: 'stable',
    tracks: ['computer-essentials'],
  },
  {
    id: 'docs:moved',
    locale: 'en',
    url: '/en/docs/new-location',
    title: 'New location',
    slugs: ['new-location'],
    status: 'stable',
    tracks: ['computer-essentials'],
  },
  {
    id: 'docs:deprecated',
    locale: 'zh',
    url: '/zh/docs/old',
    title: '旧内容',
    slugs: ['old'],
    status: 'deprecated',
  },
];

const sources: ContentProjectionSources = {
  manifest,
  taxonomy: CONTENT_TAXONOMY,
  graph: {} as ContentGraph,
  ir: manifest.map(
    (entry): ContentIrEntry => ({
      ...entry,
      sourcePath: entry.url,
      contentRevision: 'a'.repeat(64),
      mermaid: [],
    }),
  ),
};

describe('continue learning catalog', () => {
  it('resolves the current locale and keeps moved stable IDs', () => {
    const catalog = createContinueLearningCatalog('en', sources);
    assert.deepEqual(catalog.validContentIds, ['docs:moved']);
    assert.deepEqual(catalog.entries[0], {
      contentId: 'docs:moved',
      title: 'New location',
      href: '/en/docs/new-location',
      trackId: 'computer-essentials',
      trackLabel: 'Computer Essentials',
    });
  });

  it('falls back to the default readable locale when needed', () => {
    const onlyDefaultSources: ContentProjectionSources = {
      ...sources,
      manifest: [manifest[0] as ContentManifestEntry],
      ir: [sources.ir[0] as ContentIrEntry],
    };
    const catalog = createContinueLearningCatalog('en', onlyDefaultSources);
    assert.equal(catalog.entries[0]?.href, '/zh/docs/new-location');
  });
});
