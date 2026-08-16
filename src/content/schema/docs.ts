import { pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';
import { CONTENT_STATUS_IDS } from '@/content/maintenance/types';
import {
  CONTENT_DIFFICULTY_IDS,
  CONTENT_TOPIC_IDS,
  CONTENT_TRACK_IDS,
  CONTENT_TYPE_IDS,
} from '@/content/taxonomy';

export type { ContentTopic, ContentTrack, ContentType, Difficulty } from '@/content/taxonomy';
// Keep established type and constant imports stable while delegating all
// values to the taxonomy registry.
// 保留既有类型与常量导入的稳定性，所有值仍委托给分类注册表。
export {
  CONTENT_DIFFICULTY_IDS as DIFFICULTIES,
  CONTENT_TRACK_IDS as CONTENT_TRACKS,
  CONTENT_TYPE_IDS as CONTENT_TYPES,
} from '@/content/taxonomy';

// Shared person field schema for author and contributor frontmatter.
// 作者与贡献者 frontmatter 共用的人名字段 schema。
const personFieldSchema = z.union([z.string(), z.array(z.string())]);

// Content taxonomy is owned by src/content/taxonomy. Schema only derives its
// legal IDs from that registry, so labels, order, and validation cannot drift.
// 内容分类由 src/content/taxonomy 统一维护；Schema 只从注册表派生合法 ID，
// 避免显示名、排序与校验规则漂移。

// Relations reference locale-independent Content IDs derived from the stable
// frontmatter id (see createContentId in the content manifest), so they survive
// translation. Reference existence is checked at build time by
// scripts/content-pipeline.ts.
// 内容关系引用由稳定 frontmatter id 派生、与 locale 无关的 Content ID（见内容
// 清单中的 createContentId），因此可跨语言复用；引用存在性由
// scripts/content-pipeline.ts 在构建期校验。
const contentIdSchema = z.string().regex(/^docs:\S+$/);

// Stable page identity declared in frontmatter and shared across locales —
// the zh and en versions of the same content write the same value. The bare
// value must not contain whitespace or the `docs:` prefix; the manifest adds
// the prefix when deriving the full Content ID. Once declared it never changes
// with file moves, URL adjustments or title edits (see docs/adr/0003).
// 在 frontmatter 中声明、跨语言共享的稳定页面身份 —— 同一内容的中英文版本
// 写同一个值。裸值不得包含空白或 `docs:` 前缀；manifest 派生完整 Content ID
// 时再加前缀。声明后不随文件移动、URL 调整或标题修改而变化
// （见 docs/adr/0003）。
const stableIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9./-]*$/, 'stable id must be path-like ASCII without spaces');

const reviewDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'lastReviewed must use YYYY-MM-DD');

const reviewedRevisionSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, 'reviewedRevision must be a lowercase SHA-256 hex digest');

export const docsPageSchema = pageSchema.extend({
  id: stableIdSchema,
  author: personFieldSchema.optional(),
  contributor: personFieldSchema.optional(),
  contributors: personFieldSchema.optional(),
  // Lifecycle is the single publishing-state vocabulary. Existing `draft: true`
  // pages are migrated to `status: draft`; the old field is intentionally not
  // accepted as a second source of truth.
  // 生命周期是唯一发布状态词汇；现有 `draft: true` 页面迁移为 `status: draft`，
  // 旧字段刻意不再作为第二个事实来源接受。
  status: z.enum(CONTENT_STATUS_IDS).default('stable'),
  // Manually recorded confirmation date; never inferred from Git timestamps.
  // 人工记录的内容有效性确认日期；绝不从 Git 时间戳推导。
  lastReviewed: reviewDateSchema.optional(),
  // Optional Stable Content ID shown on deprecated pages.
  // deprecated 页面可选的替代页 Stable Content ID。
  replacement: contentIdSchema.optional(),
  // A translation records which source revision it was reviewed against.
  // 译文记录自己最近一次确认对应的 source revision。
  reviewedRevision: reviewedRevisionSchema.optional(),
  // Per-page switch for the interactive legacy/learning progress card.
  // 控制单篇文档是否显示兼容 Checklist / Learning Task 进度卡片。
  todoProgress: z.boolean().default(false),
  // --- Content Schema v2: optional knowledge-system metadata. ---
  // All fields stay optional; existing pages migrate incrementally.
  // --- Content Schema v2：可选的知识体系元数据。 ---
  // 全部字段可选，存量页面渐进迁移，不做批量改写。
  type: z.enum(CONTENT_TYPE_IDS).optional(),
  topics: z.array(z.enum(CONTENT_TOPIC_IDS)).optional(),
  tracks: z.array(z.enum(CONTENT_TRACK_IDS)).optional(),
  difficulty: z.enum(CONTENT_DIFFICULTY_IDS).optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  prerequisites: z.array(contentIdSchema).optional(),
  related: z.array(contentIdSchema).optional(),
});
