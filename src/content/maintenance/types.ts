import type { ContentTopic, ContentType } from '@/content/taxonomy';
import type { Locale } from '@/lib/i18n';

/**
 * Lifecycle is the only publishing-state vocabulary. `draft` used to be a
 * boolean field; existing pages are migrated to this enum so one page cannot
 * carry two competing meanings for its state.
 * 生命周期是唯一的发布状态词汇。旧版 `draft` 布尔字段迁移为此枚举，
 * 避免同一页面同时承载两套含义冲突的状态。
 */
export const CONTENT_STATUS_IDS = ['draft', 'review', 'stable', 'deprecated'] as const;

export type ContentStatus = (typeof CONTENT_STATUS_IDS)[number];

/**
 * The maintenance view consumed by content checks. Content IR satisfies this
 * shape without making the maintenance model responsible for source loading.
 * 内容检查消费的维护视图；Content IR 可以直接满足此结构，维护模型不负责
 * 加载内容源。
 */
export interface ContentMaintenanceEntry {
  readonly id: string;
  readonly locale: Locale;
  readonly title: string;
  readonly status: ContentStatus;
  readonly lastReviewed?: string;
  readonly replacement?: string;
  readonly reviewedRevision?: string;
  readonly contentRevision: string;
  readonly type?: ContentType;
  readonly topics?: readonly ContentTopic[];
}

export interface ContentMaintenanceIssue {
  readonly identity: string;
  readonly field: string;
  readonly message: string;
}

export function isContentDraft(status: ContentStatus): boolean {
  return status === 'draft';
}

/**
 * Drafts and deprecated pages remain routable, but only review/stable pages
 * are indexable public content.
 * 草稿与过时页面仍保留路由；只有 review/stable 页面属于可索引公开内容。
 */
export function isContentIndexable(status: ContentStatus): boolean {
  return status === 'review' || status === 'stable';
}
