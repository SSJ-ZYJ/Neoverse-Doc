import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMdxPlugin } from 'fumadocs-mdx/bun';

// Frontmatter only materialises when MDX goes through the compile pipeline;
// register the official fumadocs-mdx Bun plugin so the IR sees real page data
// under bun test (same reason as scripts/content-pipeline.ts).
// frontmatter 只有经过编译管线才会物化；先注册官方 fumadocs-mdx Bun 插件，
// bun test 下的 IR 才能看到真实页面数据（原因同 scripts/content-pipeline.ts）。
interface BunGlobal {
  plugin: (plugin: unknown) => Promise<unknown>;
}
const bunGlobal = (globalThis as { Bun?: BunGlobal }).Bun;
if (bunGlobal !== undefined) {
  await bunGlobal.plugin(createMdxPlugin());
}

const { contentIr, countMermaidDiagrams, createContentId } = await import('./ir');

describe('content ir', () => {
  it('derives the full Content ID from the stable frontmatter id', () => {
    assert.equal(createContentId('ch1/intro'), 'docs:ch1/intro');
  });

  it('shares one id across locale variants of the same content', () => {
    const zh = contentIr.find(
      (entry) => entry.id === 'docs:ch1/1.12-Shell-Basics' && entry.locale === 'zh',
    );
    const en = contentIr.find(
      (entry) => entry.id === 'docs:ch1/1.12-Shell-Basics' && entry.locale === 'en',
    );
    assert.ok(zh && en, 'both locale variants should be present in the IR');
    assert.equal(zh.title, '1.12 Shell 基础');
    assert.equal(en.title, '1.12 Shell Basics');
    assert.equal(zh.status, 'stable');
    assert.match(zh.contentRevision, /^[a-f0-9]{64}$/);
    assert.notEqual(zh.contentRevision, en.contentRevision);
  });

  it('points sourcePath at the on-disk file with posix separators', () => {
    for (const entry of contentIr) {
      assert.match(entry.sourcePath, /^content\/docs\/(zh|en)\/.+\.mdx?$/);
    }
  });

  it('extracts mermaid diagram sources during normalization', () => {
    const total = countMermaidDiagrams(contentIr);
    assert.ok(total > 60, `expected the real content to carry mermaid diagrams, got ${total}`);
    const withDiagrams = contentIr.filter((entry) => entry.mermaid.length > 0);
    const withoutDiagrams = contentIr.filter((entry) => entry.mermaid.length === 0);
    assert.ok(withDiagrams.length > 0);
    assert.ok(withoutDiagrams.length > 0);
    for (const entry of withDiagrams) {
      for (const source of entry.mermaid) {
        assert.ok(source.trim().length > 0, 'extracted sources are normalized and non-empty');
      }
    }
  });
});
