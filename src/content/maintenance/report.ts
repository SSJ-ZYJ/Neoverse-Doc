import { i18n, type Locale } from '@/lib/i18n';
import type { ContentMaintenanceEntry, ContentMaintenanceIssue } from './types';

export type TranslationState = 'missing' | 'outdated' | 'up-to-date';

export interface TranslationVariantReport {
  readonly locale: Locale;
  readonly state: TranslationState;
  readonly reason?: string;
  readonly sourcePath?: string;
}

export interface TranslationReport {
  readonly id: string;
  readonly title: string;
  readonly variants: readonly TranslationVariantReport[];
}

function variantState(
  locale: Locale,
  source: ContentMaintenanceEntry | undefined,
  variant: ContentMaintenanceEntry | undefined,
): TranslationVariantReport {
  const sourcePath = variant?.sourcePath ?? source?.sourcePath;

  if (variant === undefined) {
    return {
      locale,
      state: 'missing',
      reason: 'locale page does not exist',
      ...(sourcePath !== undefined ? { sourcePath } : {}),
    };
  }

  if (locale === i18n.defaultLanguage) {
    return {
      locale,
      state: 'up-to-date',
      ...(sourcePath !== undefined ? { sourcePath } : {}),
    };
  }

  if (source === undefined) {
    return {
      locale,
      state: 'outdated',
      reason: 'source locale is missing',
      ...(sourcePath !== undefined ? { sourcePath } : {}),
    };
  }

  if (variant.reviewedRevision === source.contentRevision) {
    return {
      locale,
      state: 'up-to-date',
      ...(sourcePath !== undefined ? { sourcePath } : {}),
    };
  }

  return {
    locale,
    state: 'outdated',
    reason:
      variant.reviewedRevision === undefined
        ? 'reviewedRevision is missing'
        : 'reviewedRevision does not match the current source revision',
    ...(sourcePath !== undefined ? { sourcePath } : {}),
  };
}

/**
 * Pair locales by Stable Content ID. Paths, filenames, and mtimes never take
 * part in this report.
 * 按 Stable Content ID 配对语言版本；路径、文件名与 mtime 不参与报告。
 */
export function createTranslationReport(
  entries: readonly ContentMaintenanceEntry[],
): readonly TranslationReport[] {
  const variantsById = new Map<string, Map<Locale, ContentMaintenanceEntry>>();

  for (const entry of entries) {
    const locale = entry.locale;
    let variants = variantsById.get(entry.id);
    if (variants === undefined) {
      variants = new Map();
      variantsById.set(entry.id, variants);
    }
    variants.set(locale, entry);
  }

  return [...variantsById.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, variants]) => {
      const source = variants.get(i18n.defaultLanguage);
      const firstVariant = variants.values().next().value;
      return {
        id,
        title: source?.title ?? firstVariant?.title ?? id,
        variants: i18n.languages.map((locale) =>
          variantState(locale, source, variants.get(locale)),
        ),
      };
    });
}

export function getTranslationWarnings(
  reports: readonly TranslationReport[],
): readonly ContentMaintenanceIssue[] {
  return reports.flatMap((report) =>
    report.variants
      .filter((variant) => variant.state !== 'up-to-date')
      .map((variant) => ({
        identity: `${report.id}:${variant.locale}`,
        field: 'translation',
        message: `translation ${variant.state}${variant.reason ? `：${variant.reason}` : ''}`,
        ...(variant.sourcePath !== undefined ? { sourcePath: variant.sourcePath } : {}),
      })),
  );
}

function formatVariant(variant: TranslationVariantReport): string {
  const marker = variant.state === 'up-to-date' ? '✓' : variant.state === 'outdated' ? '⚠' : '—';
  return `${variant.locale} ${marker} ${variant.state}`;
}

export function formatTranslationReport(reports: readonly TranslationReport[]): string {
  const lines = ['Translation report:'];

  for (const report of reports) {
    lines.push(`${report.title} (${report.id})`);
    for (const variant of report.variants) lines.push(formatVariant(variant));
  }

  return lines.join('\n');
}

export interface TranslationSummary {
  readonly outdated: number;
  readonly missing: number;
}

export function summarizeTranslationReport(
  reports: readonly TranslationReport[],
): TranslationSummary {
  let outdated = 0;
  let missing = 0;

  for (const report of reports) {
    for (const variant of report.variants) {
      if (variant.state === 'outdated') outdated += 1;
      if (variant.state === 'missing') missing += 1;
    }
  }

  return { outdated, missing };
}

export interface ContentHealthSummary {
  readonly deprecated: number;
  readonly needsReview: number;
  readonly translationOutdated: number;
  readonly translationMissing: number;
}

export function createContentHealthSummary(
  entries: readonly ContentMaintenanceEntry[],
  maintenanceWarnings: readonly ContentMaintenanceIssue[],
  translationReports: readonly TranslationReport[],
): ContentHealthSummary {
  const identityToId = new Map<string, string>(
    entries.map((entry) => [`${entry.id}:${entry.locale}`, entry.id] as const),
  );
  const needsReview = new Set<string>(
    entries.filter((entry) => entry.status === 'review').map((entry) => entry.id),
  );

  for (const warning of maintenanceWarnings) {
    if (warning.field === 'lastReviewed') {
      needsReview.add(identityToId.get(warning.identity) ?? warning.identity);
    }
  }

  const translations = summarizeTranslationReport(translationReports);
  return {
    deprecated: new Set(
      entries.filter((entry) => entry.status === 'deprecated').map((entry) => entry.id),
    ).size,
    needsReview: needsReview.size,
    translationOutdated: translations.outdated,
    translationMissing: translations.missing,
  };
}

export function formatContentHealthSummary(summary: ContentHealthSummary): string {
  const rows = [
    ['Deprecated', summary.deprecated],
    ['Needs Review', summary.needsReview],
    ['Translation Outdated', summary.translationOutdated],
    ['Translation Missing', summary.translationMissing],
  ] as const;
  const labelWidth = Math.max(...rows.map(([label]) => label.length));

  return [
    'Content Health',
    ...rows.map(([label, count]) => `${label.padEnd(labelWidth)}  ${count}`),
  ].join('\n');
}
