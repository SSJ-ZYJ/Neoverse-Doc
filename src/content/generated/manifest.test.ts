import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createContentId,
  createContentManifestEntry,
  getContentLanguagePaths,
  getContentManifestEntry,
} from './manifest';

describe('content manifest', () => {
  it('keeps IDs stable across locales and title changes', () => {
    assert.equal(createContentId(['ch1', 'intro']), 'docs:ch1/intro');
    assert.equal(
      createContentManifestEntry(
        { data: { title: 'Renamed' }, slugs: ['ch1', 'intro'], url: '/en/docs/ch1/intro' },
        'en',
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
      { data: { title: 'Draft', draft: true }, slugs: ['draft'], url: '/zh/docs/draft' },
      'zh',
    );
    assert.equal(entry.draft, true);
  });
});
