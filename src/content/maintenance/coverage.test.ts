import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createContentCoverageReport,
  formatContentAuthoringDiagnostics,
  formatContentMetadataCoverage,
  formatTaxonomyRegistry,
} from './coverage';
import type { ContentMetadataEntry } from './coverage';

function entry(overrides: Partial<ContentMetadataEntry> = {}): ContentMetadataEntry {
  return {
    id: 'docs:sample',
    locale: 'zh',
    sourcePath: 'content/docs/zh/sample.mdx',
    title: 'Sample',
    status: 'stable',
    ...overrides,
  };
}

describe('content metadata coverage', () => {
  it('counts normalized fields from Content IR without upgrading optional fields', () => {
    const report = createContentCoverageReport([
      entry({
        type: 'guide',
        topics: [],
        tracks: ['computer-essentials'],
        difficulty: 'beginner',
        estimatedMinutes: 20,
        prerequisites: [],
        related: [],
        lastReviewed: '2026-08-16',
      }),
      entry({ id: 'docs:other', sourcePath: 'content/docs/zh/other.mdx' }),
    ]);

    assert.equal(report.totalEntries, 2);
    assert.equal(report.totalContentIds, 2);
    assert.deepEqual(
      report.fields.map(({ field, covered, percentage }) => ({ field, covered, percentage })),
      [
        { field: 'type', covered: 1, percentage: 50 },
        { field: 'topics', covered: 1, percentage: 50 },
        { field: 'tracks', covered: 1, percentage: 50 },
        { field: 'difficulty', covered: 1, percentage: 50 },
        { field: 'estimatedMinutes', covered: 1, percentage: 50 },
        { field: 'prerequisites', covered: 1, percentage: 50 },
        { field: 'related', covered: 1, percentage: 50 },
        { field: 'status', covered: 2, percentage: 100 },
        { field: 'lastReviewed', covered: 1, percentage: 50 },
      ],
    );
    assert.equal(report.diagnostics.length, 8);
    assert.equal(report.diagnostics.some((diagnostic) => diagnostic.field === 'topics'), true);
  });

  it('keeps the default report compact and explains how to fix missing fields', () => {
    const report = createContentCoverageReport(
      Array.from({ length: 11 }, (_, index) =>
        entry({
          id: `docs:sample-${String.fromCharCode(97 + index)}`,
          sourcePath: `content/docs/zh/sample-${String.fromCharCode(97 + index)}.mdx`,
        }),
      ),
    );

    const output = formatContentAuthoringDiagnostics(report);
    assert.match(output, /showing 10, use --verbose for all/);
    assert.match(output, /warning: missing type/);
    assert.match(output, /why:/);
    assert.match(output, /fix:/);
    assert.equal(output.includes('sample-k.mdx'), false);
    assert.match(formatContentMetadataCoverage(report), /Content Metadata Coverage/);
  });

  it('renders taxonomy values from the canonical registry', () => {
    const output = formatTaxonomyRegistry();
    assert.match(output, /computer-essentials — 计算机基础 \/ Computer Essentials/);
    assert.match(output, /architecture — 架构 \/ Architecture/);
    assert.match(output, /concept — 概念 \/ Concept/);
  });
});
