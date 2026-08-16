import {
  CONTENT_TAXONOMY,
  type ContentTopic,
  type ContentTrack,
  type ContentType,
  type Difficulty,
  getTaxonomyLabel,
} from '@/content/taxonomy';
import type { Locale } from '@/lib/i18n';
import type { ContentStatus } from './types';

/**
 * Metadata dimensions tracked by the authoring report. Keep this list aligned
 * with the optional knowledge metadata in `src/content/schema/docs.ts`.
 * 作者报告追踪的元数据维度；此列表应与 docs Schema 中的知识元数据保持一致。
 */
export const CONTENT_METADATA_FIELDS = [
  'type',
  'topics',
  'tracks',
  'difficulty',
  'estimatedMinutes',
  'prerequisites',
  'related',
  'status',
  'lastReviewed',
] as const;

export type ContentMetadataField = (typeof CONTENT_METADATA_FIELDS)[number];

type AuthoringMetadataField = Exclude<ContentMetadataField, 'status'>;

/**
 * Content IR-shaped input. This deliberately lives below the IR module so the
 * report can consume the normalized data without introducing an import cycle.
 * Content IR 形状的输入；类型放在 IR 之下，确保报告消费规范化数据而不反向
 * 导入 IR 模块形成循环。
 */
export interface ContentMetadataEntry {
  readonly id: string;
  readonly locale: Locale;
  readonly sourcePath: string;
  readonly title: string;
  readonly type?: ContentType;
  readonly topics?: readonly ContentTopic[];
  readonly tracks?: readonly ContentTrack[];
  readonly difficulty?: Difficulty;
  readonly estimatedMinutes?: number;
  readonly prerequisites?: readonly string[];
  readonly related?: readonly string[];
  readonly status: ContentStatus;
  readonly lastReviewed?: string;
}

export interface ContentMetadataCoverage {
  readonly field: ContentMetadataField;
  readonly covered: number;
  readonly total: number;
  readonly percentage: number;
}

export interface ContentCoverageDiagnostic {
  readonly identity: string;
  readonly locale: Locale;
  readonly sourcePath: string;
  readonly title: string;
  readonly field: AuthoringMetadataField;
  readonly reason: string;
  readonly fix: string;
}

export interface ContentCoverageReport {
  readonly totalEntries: number;
  readonly totalContentIds: number;
  readonly fields: readonly ContentMetadataCoverage[];
  readonly diagnostics: readonly ContentCoverageDiagnostic[];
}

export interface ContentAuthoringDiagnosticsOptions {
  readonly verbose?: boolean;
  readonly maxDocuments?: number;
}

const AUTHORING_GUIDANCE: Record<
  AuthoringMetadataField,
  { readonly reason: string; readonly fix: string }
> = {
  type: {
    reason: '用于区分概念、指南与参考内容，支持统一内容投影。',
    fix: '在 Frontmatter 添加 `type: <id>`；合法 ID 见 `bun run report:content -- --taxonomy`。',
  },
  topics: {
    reason: '用于主题聚合与主题导航，不能从 Chapter、slug 或正文推断。',
    fix: '在 Frontmatter 添加 `topics: [<id>]`；合法 ID 见 `bun run report:content -- --taxonomy`。',
  },
  tracks: {
    reason: '用于学习路径归类，不能由页面所在章节代替。',
    fix: '在 Frontmatter 添加 `tracks: [<id>]`；合法 ID 见 `bun run report:content -- --taxonomy`。',
  },
  difficulty: {
    reason: '用于表达读者所需的内容难度，帮助学习路径排序。',
    fix: '在 Frontmatter 添加 `difficulty: <id>`；合法 ID 见 `bun run report:content -- --taxonomy`。',
  },
  estimatedMinutes: {
    reason: '用于提供学习投入时间的近似值，必须是正整数分钟。',
    fix: '在 Frontmatter 添加 `estimatedMinutes: <positive integer>`。',
  },
  prerequisites: {
    reason: '用于声明学习前置关系并构建无环内容图谱。',
    fix: '需要前置内容时添加 `prerequisites: [docs:<stable-id>]`；没有前置内容可显式写 `[]`。',
  },
  related: {
    reason: '用于声明作者认可的相关推荐，不会自动推导对称关系。',
    fix: '需要相关推荐时添加 `related: [docs:<stable-id>]`；没有相关推荐可显式写 `[]`。',
  },
  lastReviewed: {
    reason: '用于记录最近一次人工确认技术内容仍有效的日期，不等同于文件修改时间。',
    fix: '完成技术复核后添加 `lastReviewed: YYYY-MM-DD`；不要从 Git 时间戳推断。',
  },
};

function isCovered(entry: ContentMetadataEntry, field: ContentMetadataField): boolean {
  // An explicitly declared empty array is meaningful author intent (for
  // example, a page can explicitly have no prerequisites), so only undefined
  // counts as missing. `status` is already materialized by the Schema default.
  // 显式空数组也是作者意图（例如页面明确没有前置内容），因此只有
  // undefined 算缺失；`status` 已由 Schema 默认值物化。
  return entry[field] !== undefined;
}

function percentage(covered: number, total: number): number {
  return total === 0 ? 0 : Math.round((covered / total) * 100);
}

export function createContentCoverageReport(
  entries: readonly ContentMetadataEntry[],
): ContentCoverageReport {
  const totalEntries = entries.length;
  const totalContentIds = new Set(entries.map((entry) => entry.id)).size;
  const fields = CONTENT_METADATA_FIELDS.map((field) => {
    const covered = entries.filter((entry) => isCovered(entry, field)).length;
    return {
      field,
      covered,
      total: totalEntries,
      percentage: percentage(covered, totalEntries),
    };
  });

  const diagnostics = entries.flatMap((entry) =>
    CONTENT_METADATA_FIELDS.filter(
      (field): field is AuthoringMetadataField => field !== 'status' && !isCovered(entry, field),
    ).map((field) => ({
      identity: `${entry.id}:${entry.locale}`,
      locale: entry.locale,
      sourcePath: entry.sourcePath,
      title: entry.title,
      field,
      ...AUTHORING_GUIDANCE[field],
    })),
  );

  return { totalEntries, totalContentIds, fields, diagnostics };
}

function groupDiagnostics(
  diagnostics: readonly ContentCoverageDiagnostic[],
): readonly ContentCoverageDiagnostic[][] {
  const byIdentity = new Map<string, ContentCoverageDiagnostic[]>();

  for (const diagnostic of diagnostics) {
    const group = byIdentity.get(diagnostic.identity) ?? [];
    group.push(diagnostic);
    byIdentity.set(diagnostic.identity, group);
  }

  return [...byIdentity.values()].sort((left, right) => {
    const countDifference = right.length - left.length;
    if (countDifference !== 0) return countDifference;
    return left[0].sourcePath.localeCompare(right[0].sourcePath);
  });
}

export function formatContentMetadataCoverage(report: ContentCoverageReport): string {
  const labelWidth = Math.max(...report.fields.map((field) => field.field.length));
  const lines = [
    'Content Metadata Coverage',
    `Scope: ${report.totalEntries} locale page(s), ${report.totalContentIds} Content ID(s)`,
    'Definition: normalized IR values count; Schema defaults count for status; explicit [] counts as authored.',
    '',
  ];

  for (const field of report.fields) {
    const label = field.field.padEnd(labelWidth);
    lines.push(
      `${label}  ${String(field.percentage).padStart(3)}% (${field.covered}/${field.total})`,
    );
  }

  lines.push(
    '',
    'Coverage is informational; missing optional metadata does not fail the content check.',
  );
  return lines.join('\n');
}

export function formatContentAuthoringDiagnostics(
  report: ContentCoverageReport,
  options: ContentAuthoringDiagnosticsOptions = {},
): string {
  const groups = groupDiagnostics(report.diagnostics);
  if (groups.length === 0) return 'Authoring diagnostics: no missing optional metadata.';

  const verbose = options.verbose ?? false;
  const maxDocuments = options.maxDocuments ?? 10;
  const visibleGroups = verbose ? groups : groups.slice(0, maxDocuments);
  const lines = [
    `Authoring diagnostics: ${groups.length} page(s) with missing metadata` +
      (verbose || groups.length <= maxDocuments
        ? '.'
        : `; showing ${maxDocuments}, use --verbose for all.`),
  ];

  for (const group of visibleGroups) {
    lines.push('', group[0].sourcePath);
    for (const diagnostic of group) {
      lines.push(
        `  warning: missing ${diagnostic.field} — why: ${diagnostic.reason} — fix: ${diagnostic.fix}`,
      );
    }
  }

  return lines.join('\n');
}

const TAXONOMY_GROUPS = [
  ['types', 'Type'],
  ['topics', 'Topic'],
  ['tracks', 'Track'],
  ['difficulties', 'Difficulty'],
] as const satisfies readonly [keyof typeof CONTENT_TAXONOMY, string][];

export function formatTaxonomyRegistry(): string {
  const lines = ['Taxonomy Registry (canonical IDs):'];

  for (const [key, label] of TAXONOMY_GROUPS) {
    lines.push('', `${label}:`);
    for (const entry of CONTENT_TAXONOMY[key]) {
      lines.push(
        `  ${entry.id} — ${getTaxonomyLabel(entry, 'zh')} / ${getTaxonomyLabel(entry, 'en')}`,
      );
    }
  }

  return lines.join('\n');
}

export function getContentAuthoringFix(field: string): string {
  switch (field) {
    case 'type':
    case 'topics':
    case 'tracks':
    case 'difficulty':
    case 'estimatedMinutes':
    case 'prerequisites':
    case 'related':
    case 'lastReviewed':
      return AUTHORING_GUIDANCE[field].fix;
    default:
      break;
  }

  if (field === 'id') {
    return '使用不含空格的 ASCII path-like Stable ID，并保持各 locale 版本一致。';
  }
  if (field === 'replacement') {
    return '仅在 `status: deprecated` 页面填写存在且不同于自身的 `docs:<stable-id>`。';
  }
  if (field === 'reviewedRevision') {
    return '仅在译文中填写与当前 source `contentRevision` 对应的 SHA-256 revision。';
  }
  if (field === 'translation') {
    return '同步译文后更新 `reviewedRevision`，或补齐缺失的 locale 页面。';
  }
  return '根据当前 Schema、Content ID 与 Taxonomy Registry 修正该字段。';
}
