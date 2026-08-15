import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMdxPlugin } from 'fumadocs-mdx/bun';

// Frontmatter only materialises when MDX goes through the compile pipeline;
// register the official fumadocs-mdx Bun plugin so the manifest sees real
// page data under bun test (same reason as scripts/check-content.ts).
// frontmatter 只有经过编译管线才会物化；先注册官方 fumadocs-mdx Bun 插件，
// bun test 下的 manifest 才能看到真实页面数据（原因同 scripts/check-content.ts）。
interface BunGlobal {
  plugin: (plugin: unknown) => Promise<unknown>;
}
const bunGlobal = (globalThis as { Bun?: BunGlobal }).Bun;
if (bunGlobal !== undefined) {
  await bunGlobal.plugin(createMdxPlugin());
}

const {
  createContentId,
  createContentManifestEntry,
  getContentLanguagePaths,
  getContentManifestEntry,
} = await import('./manifest');

describe('content manifest', () => {
  it('keeps IDs stable across locales, title changes and file moves', () => {
    assert.equal(createContentId('ch1/intro'), 'docs:ch1/intro');
    assert.equal(
      createContentManifestEntry(
        { data: { id: 'ch1/intro', title: 'Renamed' }, slugs: ['ch1', 'intro'], url: '/en/docs/ch1/intro' },
        'en',
      ).id,
      'docs:ch1/intro',
    );
    // Identity is owned by frontmatter, not by path: moving the file (new
    // slugs / url) must not change the Content ID.
    // 身份归属 frontmatter 而非路径：移动文件（新的 slugs / url）不得改变 Content ID。
    assert.equal(
      createContentManifestEntry(
        {
          data: { id: 'ch1/intro', title: 'Moved' },
          slugs: ['ch1', 'intro-moved'],
          url: '/zh/docs/ch1/intro-moved',
        },
        'zh',
      ).id,
      'docs:ch1/intro',
    );
  });

  it('exposes real localized entries and language paths', () => {
    const entry = getContentManifestEntry('docs:ch1/1.1-File-Management', 'zh');
    assert.equal(entry?.url, '/zh/docs/ch1/1.1-File-Management');
    assert.deepEqual(getContentLanguagePaths('docs:ch1/1.1-File-Management'), {
      zh: '/zh/docs/ch1/1.1-File-Management',
      en: '/en/docs/ch1/1.1-File-Management',
    });
  });

  it('retains draft state for consumer-side filtering', () => {
    const entry = createContentManifestEntry(
      { data: { id: 'draft', title: 'Draft', draft: true }, slugs: ['draft'], url: '/zh/docs/draft' },
      'zh',
    );
    assert.equal(entry.draft, true);
  });

  it('passes Content Schema v2 fields through and omits undeclared ones', () => {
    const entry = createContentManifestEntry(
      {
        data: {
          id: 'ch1/1.12-Shell-Basics',
          title: 'Shell 基础',
          type: 'guide',
          topics: ['shell', 'terminal'],
          track: ['computer-essentials'],
          difficulty: 'beginner',
          estimatedMinutes: 60,
          prerequisites: ['docs:ch1/1.11-Operating-Systems'],
          related: ['docs:ch1/1.13-Shell-Text-Editing'],
        },
        slugs: ['ch1', '1.12-Shell-Basics'],
        url: '/zh/docs/ch1/1.12-Shell-Basics',
      },
      'zh',
    );
    assert.equal(entry.type, 'guide');
    assert.deepEqual(entry.topics, ['shell', 'terminal']);
    assert.deepEqual(entry.track, ['computer-essentials']);
    assert.equal(entry.difficulty, 'beginner');
    assert.equal(entry.estimatedMinutes, 60);
    assert.deepEqual(entry.prerequisites, ['docs:ch1/1.11-Operating-Systems']);
    assert.deepEqual(entry.related, ['docs:ch1/1.13-Shell-Text-Editing']);

    const plain = createContentManifestEntry(
      { data: { id: 'plain', title: 'Plain' }, slugs: ['plain'], url: '/zh/docs/plain' },
      'zh',
    );
    for (const field of [
      'type',
      'topics',
      'track',
      'difficulty',
      'estimatedMinutes',
      'prerequisites',
      'related',
    ] as const) {
      assert.equal(field in plain, false, `${field} should be absent when undeclared`);
    }
  });

  it('carries pilot v2 metadata with locale-independent IDs on real pages', () => {
    for (const locale of ['zh', 'en'] as const) {
      const entry = getContentManifestEntry('docs:ch1/1.12-Shell-Basics', locale);
      assert.equal(entry?.type, 'guide');
      assert.deepEqual(entry?.track, ['computer-essentials']);
      assert.deepEqual(entry?.prerequisites, ['docs:ch1/1.11-Operating-Systems']);
    }
  });
});
