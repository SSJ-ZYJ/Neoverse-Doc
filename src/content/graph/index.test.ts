import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMdxPlugin } from 'fumadocs-mdx/bun';

interface BunGlobal {
  plugin: (plugin: unknown) => Promise<unknown>;
}
const bunGlobal = (globalThis as { Bun?: BunGlobal }).Bun;
if (bunGlobal !== undefined) {
  await bunGlobal.plugin(createMdxPlugin());
}

const { getPrerequisites, getRelated, getRelatedBy, getRequiredBy } = await import('./index');

describe('content graph API', () => {
  it('reads the actual stable-ID relations compiled from Content IR', () => {
    assert.deepEqual(getPrerequisites('docs:ch1/1.12-Shell-Basics'), [
      'docs:ch1/1.11-Operating-Systems',
    ]);
    assert.deepEqual(getRequiredBy('docs:ch1/1.12-Shell-Basics'), [
      'docs:ch1/1.13-Shell-Text-Editing',
    ]);
    assert.deepEqual(getRelated('docs:ch1/1.12-Shell-Basics'), [
      'docs:ch1/1.13-Shell-Text-Editing',
    ]);
    assert.deepEqual(getRelatedBy('docs:ch1/1.13-Shell-Text-Editing'), [
      'docs:ch1/1.12-Shell-Basics',
    ]);
  });
});
