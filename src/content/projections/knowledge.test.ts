import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContentManifestEntry } from '@/content/generated/manifest';
import type { ContentGraph } from '@/content/graph';
import type { ContentIrEntry } from '@/content/ir';
import { CONTENT_TAXONOMY } from '@/content/taxonomy';
import type { ContentProjectionSources } from './sources';
import { createDocumentKnowledgeProjection, getKnowledgeManifestEntry } from './knowledge';

const manifest: readonly ContentManifestEntry[] = [
  {
    id: 'docs:current',
    locale: 'zh',
    url: '/zh/docs/ch1/current',
    title: '当前内容',
    slugs: ['ch1', 'current'],
    status: 'stable',
    tracks: ['computer-essentials'],
  },
  {
    id: 'docs:next',
    locale: 'zh',
    url: '/zh/docs/ch1/next',
    title: '下一内容',
    slugs: ['ch1', 'next'],
    status: 'stable',
    tracks: ['computer-essentials'],
  },
  {
    id: 'docs:base',
    locale: 'zh',
    url: '/zh/docs/ch1/base',
    title: '前置内容',
    slugs: ['ch1', 'base'],
    status: 'stable',
  },
  {
    id: 'docs:required',
    locale: 'zh',
    url: '/zh/docs/ch1/required',
    title: '后续要求内容',
    slugs: ['ch1', 'required'],
    status: 'stable',
  },
  {
    id: 'docs:related-a',
    locale: 'zh',
    url: '/zh/docs/ch1/related-a',
    title: '关联内容 A',
    slugs: ['ch1', 'related-a'],
    status: 'stable',
  },
  {
    id: 'docs:related-b',
    locale: 'zh',
    url: '/zh/docs/ch1/related-b',
    title: '关联内容 B',
    slugs: ['ch1', 'related-b'],
    status: 'stable',
  },
  {
    id: 'docs:translated-only',
    locale: 'zh',
    url: '/zh/docs/ch1/translated-only',
    title: '只有默认语言的内容',
    slugs: ['ch1', 'translated-only'],
    status: 'stable',
  },
];

const graph: ContentGraph = {
  getContentNode() {
    return undefined;
  },
  getPrerequisites(id) {
    return id === 'docs:current' ? ['docs:base'] : [];
  },
  getRequiredBy(id) {
    return id === 'docs:current' ? ['docs:required'] : [];
  },
  getRelated(id) {
    return id === 'docs:current' ? ['docs:related-a'] : [];
  },
  getRelatedBy(id) {
    return id === 'docs:current' ? ['docs:related-b'] : [];
  },
};

const sources: ContentProjectionSources = {
  manifest,
  graph,
  taxonomy: CONTENT_TAXONOMY,
  ir: manifest.map(
    (entry): ContentIrEntry => ({
      ...entry,
      sourcePath: entry.url,
      contentRevision: 'a'.repeat(64),
      mermaid: [],
    }),
  ),
};

describe('document knowledge projection', () => {
  it('uses Learn track order before reverse graph relations and deduplicates related items', () => {
    const projection = createDocumentKnowledgeProjection('docs:current', 'zh', sources);

    assert.deepEqual(projection, {
      contentId: 'docs:current',
      prerequisiteIds: ['docs:base'],
      recommendedNextId: 'docs:next',
      relatedIds: ['docs:related-a', 'docs:related-b'],
    });
  });

  it('falls back to the default locale for stable ID link resolution', () => {
    const entry = getKnowledgeManifestEntry(sources, 'docs:translated-only', 'en');

    assert.deepEqual(entry, manifest[6]);
  });
});
