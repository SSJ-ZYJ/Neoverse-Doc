import { pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';

// Shared person field schema for author and contributor frontmatter.
// 作者与贡献者 frontmatter 共用的人名字段 schema。
const personFieldSchema = z.union([z.string(), z.array(z.string())]);

// Content Schema v2 — what a page IS, decoupled from where it lives.
// Start with three stable semantics; add new types only when a real boundary
// appears in actual content (e.g. essay, tutorial), never speculatively.
// Content Schema v2 的内容类型 —— 表达内容“是什么”，与目录位置解耦。
// 从三个稳定语义起步，仅在真实内容出现明确边界时再新增（如 essay、tutorial），
// 不做投机性扩展。
export const CONTENT_TYPES = ['concept', 'guide', 'reference'] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

// Learning tracks are product-level, few, and will carry localized display
// names later — a closed registry instead of free tags. Topics below take the
// opposite stance: open kebab-case vocabulary that evolves with content.
// 学习路径是少量产品级路径，未来要挂本地化显示名，因此收敛为闭集注册表；
// 下方的 topics 采取相反策略：随内容自然演化的开放 kebab-case 词汇。
export const CONTENT_TRACKS = ['computer-essentials'] as const;

export type ContentTrack = (typeof CONTENT_TRACKS)[number];

// Open knowledge topics, decoupled from the directory tree. A page may belong
// to multiple topics (e.g. shell + terminal).
// 开放的知识主题，与目录树解耦，一篇内容可属多个主题（如 shell + terminal）。
const topicSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

// Difficulty stays deliberately coarse — no scoring system.
// 难度刻意保持粗粒度，不构建评分系统。
export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];

// Relations reference locale-independent Content IDs derived from the stable
// frontmatter id (see createContentId in the content manifest), so they survive
// translation. Reference existence is checked at build time by
// scripts/check-content.ts.
// 内容关系引用由稳定 frontmatter id 派生、与 locale 无关的 Content ID（见内容
// 清单中的 createContentId），因此可跨语言复用；引用存在性由
// scripts/check-content.ts 在构建期校验。
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

export const docsPageSchema = pageSchema.extend({
  id: stableIdSchema,
  author: personFieldSchema.optional(),
  contributor: personFieldSchema.optional(),
  contributors: personFieldSchema.optional(),
  // Per-page publishing state for the soft draft gate.
  // 控制单篇文档是否显示可临时解锁的草稿施工提示。
  draft: z.boolean().default(false),
  // Per-page switch for the interactive TODO progress card.
  // 控制单篇文档是否显示可交互 TODO 进度卡片。
  todoProgress: z.boolean().default(false),
  // --- Content Schema v2: optional knowledge-system metadata. ---
  // All fields stay optional; existing pages migrate incrementally.
  // --- Content Schema v2：可选的知识体系元数据。 ---
  // 全部字段可选，存量页面渐进迁移，不做批量改写。
  type: z.enum(CONTENT_TYPES).optional(),
  topics: z.array(topicSchema).optional(),
  track: z.array(z.enum(CONTENT_TRACKS)).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  prerequisites: z.array(contentIdSchema).optional(),
  related: z.array(contentIdSchema).optional(),
});
