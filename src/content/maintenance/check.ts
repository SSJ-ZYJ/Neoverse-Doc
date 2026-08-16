import { resolveFreshnessPolicy } from '@/content/taxonomy/maintenance';
import { i18n } from '@/lib/i18n';
import type { ContentMaintenanceEntry, ContentMaintenanceIssue } from './types';

const MILLISECONDS_PER_DAY = 86_400_000;

export interface ContentMaintenanceCheckResult {
  readonly errors: readonly ContentMaintenanceIssue[];
  readonly warnings: readonly ContentMaintenanceIssue[];
}

/** Parse and calendar-validate the manually maintained ISO review date. */
export function parseReviewDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return;
  }

  return date;
}

function utcDay(date: Date): number {
  return (
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / MILLISECONDS_PER_DAY
  );
}

function issue(
  entry: ContentMaintenanceEntry,
  field: string,
  message: string,
): ContentMaintenanceIssue {
  return { identity: `${entry.id}:${entry.locale}`, field, message };
}

/**
 * Validate hard maintenance relationships and collect non-blocking freshness
 * warnings. The clock is injectable so checks remain deterministic in tests.
 * 校验会阻断构建的维护关系，并收集不会阻断构建的 freshness 警告；时钟可
 * 注入以保证测试确定性。
 */
export function validateContentMaintenance(
  entries: readonly ContentMaintenanceEntry[],
  now = new Date(),
): ContentMaintenanceCheckResult {
  const knownIds = new Set(entries.map((entry) => entry.id));
  const errors: ContentMaintenanceIssue[] = [];
  const warnings: ContentMaintenanceIssue[] = [];
  const today = utcDay(now);

  for (const entry of entries) {
    if (entry.replacement !== undefined) {
      if (entry.status !== 'deprecated') {
        errors.push(
          issue(entry, 'replacement', '`replacement` 只能用于 status: deprecated 的页面'),
        );
      }
      if (entry.replacement === entry.id) {
        errors.push(issue(entry, 'replacement', 'replacement 不能指向自身'));
      } else if (!knownIds.has(entry.replacement)) {
        errors.push(issue(entry, 'replacement', `replacement 目标不存在：${entry.replacement}`));
      }
    }

    if (entry.locale === i18n.defaultLanguage && entry.reviewedRevision !== undefined) {
      errors.push(
        issue(
          entry,
          'reviewedRevision',
          `source locale ${i18n.defaultLanguage} 不应声明 reviewedRevision；该字段只记录译文确认过的 source revision`,
        ),
      );
    }

    let reviewedAt: Date | undefined;
    if (entry.lastReviewed !== undefined) {
      reviewedAt = parseReviewDate(entry.lastReviewed);
      if (reviewedAt === undefined) {
        errors.push(issue(entry, 'lastReviewed', '必须是有效的 YYYY-MM-DD 日期'));
      } else if (utcDay(reviewedAt) > today) {
        errors.push(
          issue(entry, 'lastReviewed', '不能使用未来日期；该字段表示最近一次已完成的复核'),
        );
      }
    }

    // Drafts are still being written; deprecated pages are governed by their
    // replacement notice rather than an additional freshness alarm.
    // 草稿仍在编写，deprecated 页面由替代页提示治理，不重复发 freshness 警告。
    if (entry.status === 'draft' || entry.status === 'deprecated') continue;

    const policy = resolveFreshnessPolicy(entry);
    if (reviewedAt === undefined) {
      if (entry.lastReviewed === undefined) {
        warnings.push(
          issue(
            entry,
            'lastReviewed',
            `缺少复核日期；当前维护策略为 ${policy.id}（${policy.reviewIntervalDays} 天）`,
          ),
        );
      }
      continue;
    }

    const ageDays = today - utcDay(reviewedAt);
    if (ageDays >= policy.reviewIntervalDays) {
      warnings.push(
        issue(
          entry,
          'lastReviewed',
          `已 ${ageDays} 天未复核，超过 ${policy.id} 策略的 ${policy.reviewIntervalDays} 天周期`,
        ),
      );
    }
  }

  return { errors, warnings };
}
