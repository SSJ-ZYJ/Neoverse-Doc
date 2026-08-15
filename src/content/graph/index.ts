import { contentIr } from '../ir';
import { compileContentGraph } from './compiler';

export { compileContentGraph } from './compiler';
export type {
  ContentGraph,
  ContentGraphNode,
  ContentRelationEntry,
  ContentRelationField,
  ContentRelationViolation,
} from './types';
export { CONTENT_RELATION_FIELDS } from './types';
export { validateContentRelations } from './validation';

/**
 * The application graph is derived from Content IR at module load, just like
 * the manifest. No graph consumer needs to inspect a raw MDX file.
 * 应用图谱与 Manifest 一样在模块加载时由 Content IR 派生，无需读取原始 MDX。
 */
export const contentGraph = compileContentGraph(contentIr);

export function getContentNode(id: string) {
  return contentGraph.getContentNode(id);
}

export function getPrerequisites(id: string) {
  return contentGraph.getPrerequisites(id);
}

export function getRequiredBy(id: string) {
  return contentGraph.getRequiredBy(id);
}

export function getRelated(id: string) {
  return contentGraph.getRelated(id);
}

export function getRelatedBy(id: string) {
  return contentGraph.getRelatedBy(id);
}
