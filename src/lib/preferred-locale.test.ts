import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getPreferredLocale } from './preferred-locale';

describe('getPreferredLocale', () => {
  test('recognizes Chinese language variants', () => {
    assert.equal(getPreferredLocale(['zh-CN']), 'zh');
    assert.equal(getPreferredLocale(['zh-Hant-HK']), 'zh');
  });

  test('recognizes English language variants', () => {
    assert.equal(getPreferredLocale(['en-US']), 'en');
    assert.equal(getPreferredLocale(['en-GB']), 'en');
  });

  test('respects the first supported browser preference', () => {
    assert.equal(getPreferredLocale(['fr-FR', 'zh-CN', 'en-US']), 'zh');
    assert.equal(getPreferredLocale(['en-US', 'zh-CN']), 'en');
  });

  test('falls back to English when neither supported language is present', () => {
    assert.equal(getPreferredLocale(['ja-JP']), 'en');
    assert.equal(getPreferredLocale([]), 'en');
  });
});
