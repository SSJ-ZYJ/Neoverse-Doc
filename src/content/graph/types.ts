import type { Locale } from '@/lib/i18n';

export const CONTENT_RELATION_FIELDS = ['prerequisites', 'related'] as const;

export type ContentRelationField = (typeof CONTENT_RELATION_FIELDS)[number];

/**
 * The relation-only projection consumed by the graph compiler and validator.
 * Content IR structurally satisfies this interface without re-reading MDX.
 * 图谱编译器与校验器消费的关系投影；Content IR 可直接满足该接口。
 */
export interface ContentRelationEntry {
  readonly id: string;
  readonly locale: Locale;
  readonly prerequisites?: readonly string[];
  readonly related?: readonly string[];
}

export interface ContentGraphNode {
  readonly id: string;
  readonly prerequisites: readonly string[];
  readonly requiredBy: readonly string[];
  readonly related: readonly string[];
  readonly relatedBy: readonly string[];
}

/**
 * Stable read interface for the locale-independent knowledge graph.
 * Consumers never receive the compiler's internal Map or Set instances.
 * 面向消费方的稳定图谱读取接口，不暴露编译器内部 Map / Set。
 */
export interface ContentGraph {
  getContentNode(id: string): ContentGraphNode | undefined;
  getPrerequisites(id: string): readonly string[];
  getRequiredBy(id: string): readonly string[];
  getRelated(id: string): readonly string[];
  getRelatedBy(id: string): readonly string[];
}

export interface ContentRelationViolation {
  readonly identity: string;
  readonly field: ContentRelationField;
  readonly message: string;
}
