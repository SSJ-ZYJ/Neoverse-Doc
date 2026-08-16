import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveFreshnessPolicy } from '@/content/taxonomy/maintenance';
import { validateContentMaintenance } from './check';
import { createTranslationReport, getTranslationWarnings } from './report';
import type { ContentMaintenanceEntry } from './types';

const SOURCE_REVISION = 'a'.repeat(64);

function entry(overrides: Partial<ContentMaintenanceEntry> = {}): ContentMaintenanceEntry {
  return {
    id: 'docs:sample',
    locale: 'zh',
    title: 'Sample',
    status: 'stable',
    contentRevision: SOURCE_REVISION,
    ...overrides,
  };
}

describe('content maintenance policy', () => {
  it('uses the shortest matching taxonomy interval', () => {
    assert.deepEqual(
      resolveFreshnessPolicy({ type: 'concept', topics: ['architecture', 'shell'] }),
      { id: 'fast-moving', reviewIntervalDays: 90 },
    );
    assert.deepEqual(resolveFreshnessPolicy({}), {
      id: 'stable',
      reviewIntervalDays: 730,
    });
  });

  it('keeps invalid replacement relations as errors and freshness as warnings', () => {
    const result = validateContentMaintenance(
      [
        entry({ replacement: 'docs:sample' }),
        entry({ id: 'docs:deprecated', status: 'deprecated', replacement: 'docs:sample' }),
        entry({ id: 'docs:fast', type: 'reference', topics: ['shell'] }),
      ],
      new Date('2026-08-16T12:00:00Z'),
    );

    assert.ok(result.errors.some((issue) => issue.field === 'replacement'));
    assert.ok(result.warnings.some((issue) => issue.identity === 'docs:fast:zh'));
    assert.equal(
      result.warnings.some((issue) => issue.identity === 'docs:deprecated:zh'),
      false,
    );
  });
});

describe('translation drift report', () => {
  it('pairs by Stable Content ID and distinguishes missing from outdated', () => {
    const reports = createTranslationReport([
      entry({ contentRevision: SOURCE_REVISION }),
      entry({
        locale: 'en',
        title: 'Sample',
        reviewedRevision: SOURCE_REVISION,
        contentRevision: 'b'.repeat(64),
      }),
      entry({
        id: 'docs:missing-en',
        contentRevision: SOURCE_REVISION,
        title: 'Missing English',
      }),
      entry({
        id: 'docs:outdated',
        contentRevision: SOURCE_REVISION,
        title: 'Outdated',
      }),
      entry({
        id: 'docs:outdated',
        locale: 'en',
        contentRevision: 'b'.repeat(64),
        title: 'Outdated',
        reviewedRevision: 'c'.repeat(64),
      }),
    ]);

    const sample = reports.find((report) => report.id === 'docs:sample');
    const missing = reports.find((report) => report.id === 'docs:missing-en');
    const outdated = reports.find((report) => report.id === 'docs:outdated');

    assert.equal(sample?.variants.find((variant) => variant.locale === 'en')?.state, 'up-to-date');
    assert.equal(missing?.variants.find((variant) => variant.locale === 'en')?.state, 'missing');
    assert.equal(outdated?.variants.find((variant) => variant.locale === 'en')?.state, 'outdated');
    assert.equal(getTranslationWarnings(reports).length, 2);
  });
});
