import { pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';

// Shared person field schema for author and contributor frontmatter.
// 作者与贡献者 frontmatter 共用的人名字段 schema。
const personFieldSchema = z.union([z.string(), z.array(z.string())]);

export const docsPageSchema = pageSchema.extend({
  author: personFieldSchema.optional(),
  contributor: personFieldSchema.optional(),
  contributors: personFieldSchema.optional(),
  // Per-page publishing state for the soft draft gate.
  // 控制单篇文档是否显示可临时解锁的草稿施工提示。
  draft: z.boolean().default(false),
  // Per-page switch for the interactive TODO progress card.
  // 控制单篇文档是否显示可交互 TODO 进度卡片。
  todoProgress: z.boolean().default(false),
});
