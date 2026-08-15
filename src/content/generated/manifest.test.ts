import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMdxPlugin } from 'fumadocs-mdx/bun';

// Frontmatter only materialises when MDX goes through the compile pipeline;
// register the official fumadocs-mdx Bun plugin so the manifest (built over
// the Content IR) sees real page data under bun test.
// frontmatter 只有经过编译管线才会物化；先注册官方 fumadocs-mdx Bun 插件，
// bun test 下的 manifest（基于 Content IR 构建）才能看到真实页面数据。
interface BunGlobal {
  plugin: (plugin: unknown) => Promise<unknown>;
}
const bunGlobal = (globalThis as { Bun?: BunGlobal }).Bun;
if (bunGlobal !== undefined) {
  await bunGlobal.plugin(createMdxPlugin());
}

const { getContentLanguagePaths, getContentManifestEntry, createManifestEntry } = await import(
  './manifest'
);

import type { ContentIrEntry } from '../ir';

const baseIrEntry: ContentIrEntry = {
  id: 'docs:ir/sample',
  locale: 'zh',
  url: '/zh/docs/ir/sample',
  title: 'Sample',
  slugs: ['ir', 'sample'],
  sourcePath: 'zh/ch1/sample.mdx',
  mermaid: ['flowchart TD\n  A --> B'],
};

describe('content manifest', () => {
  it('is derived from the IR without IR-only build fields', () => {
    const entry = createManifestEntry({ ...baseIrEntry, draft: true, type: 'guide' });
    assert.equal(entry.id, 'docs:ir/sample');
    assert.equal(entry.draft, true);
    assert.equal(entry.type, 'guide');
    assert.equal('sourcePath' in entry, false, 'sourcePath must stay IR-only');
    assert.equal('mermaid' in entry, false, 'mermaid sources must stay IR-only');
  });

  it('exposes real localized entries and language paths', () => {
    const entry = getContentManifestEntry('docs:ch1/1.1-File-Management', 'zh');
    assert.equal(entry?.url, '/zh/docs/ch1/1.1-File-Management');
    assert.deepEqual(getContentLanguagePaths('docs:ch1/1.1-File-Management'), {
      zh: '/zh/docs/ch1/1.1-File-Management',
      en: '/en/docs/ch1/1.1-File-Management',
    });
  });

  it('passes Content Schema v2 fields through and omits undeclared ones', () => {
    const entry = createManifestEntry({
      ...baseIrEntry,
      topics: ['shell', 'terminal'],
      tracks: ['computer-essentials'],
      difficulty: 'beginner',
      estimatedMinutes: 60,
      prerequisites: ['docs:ch1/1.11-Operating-Systems'],
      related: ['docs:ch1/1.13-Shell-Text-Editing'],
    });
    assert.deepEqual(entry.topics, ['shell', 'terminal']);
    assert.deepEqual(entry.tracks, ['computer-essentials']);
    assert.equal(entry.difficulty, 'beginner');
    assert.equal(entry.estimatedMinutes, 60);
    assert.deepEqual(entry.prerequisites, ['docs:ch1/1.11-Operating-Systems']);
    assert.deepEqual(entry.related, ['docs:ch1/1.13-Shell-Text-Editing']);

    const plain = createManifestEntry(baseIrEntry);
    for (const field of [
      'type',
      'topics',
      'tracks',
      'difficulty',
      'estimatedMinutes',
      'prerequisites',
      'related',
      'draft',
      'description',
    ] as const) {
      assert.equal(field in plain, false, `${field} should be absent when undeclared`);
    }
  });

  it('carries pilot v2 metadata with locale-independent IDs on real pages', () => {
    for (const locale of ['zh', 'en'] as const) {
      const entry = getContentManifestEntry('docs:ch1/1.12-Shell-Basics', locale);
      assert.equal(entry?.type, 'guide');
      assert.deepEqual(entry?.tracks, ['computer-essentials']);
      assert.deepEqual(entry?.prerequisites, ['docs:ch1/1.11-Operating-Systems']);
    }
  });
});
