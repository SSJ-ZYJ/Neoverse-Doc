import { type ContentManifestEntry, contentManifest } from '@/content/generated/manifest';
import { type ContentGraph, contentGraph } from '@/content/graph';
import { type ContentIrEntry, contentIr } from '@/content/ir';
import { CONTENT_TAXONOMY } from '@/content/taxonomy';

/**
 * The only input bundle available to product projections. It keeps product
 * views derived from the Content Model instead of re-reading MDX or inventing
 * feature-local metadata.
 *
 * 产品投影唯一可用的输入集合。它让产品视图从 Content Model 派生，
 * 不重新读取 MDX，也不在 Feature 内维护另一份元数据。
 */
export interface ContentProjectionSources {
  readonly ir: readonly ContentIrEntry[];
  readonly manifest: readonly ContentManifestEntry[];
  readonly taxonomy: typeof CONTENT_TAXONOMY;
  readonly graph: ContentGraph;
}

export const contentProjectionSources = {
  ir: contentIr,
  manifest: contentManifest,
  taxonomy: CONTENT_TAXONOMY,
  graph: contentGraph,
} satisfies ContentProjectionSources;
