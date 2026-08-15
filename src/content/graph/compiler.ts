import type { ContentGraph, ContentGraphNode, ContentRelationEntry } from './types';

const EMPTY_RELATIONS = Object.freeze([]) as readonly string[];

interface MutableContentGraphNode {
  prerequisites: Set<string>;
  requiredBy: Set<string>;
  related: Set<string>;
  relatedBy: Set<string>;
}

function createMutableNode(): MutableContentGraphNode {
  return {
    prerequisites: new Set<string>(),
    requiredBy: new Set<string>(),
    related: new Set<string>(),
    relatedBy: new Set<string>(),
  };
}

function toReadonlyRelations(values: ReadonlySet<string>): readonly string[] {
  return Object.freeze([...values].sort());
}

function finalizeNode(id: string, node: MutableContentGraphNode): ContentGraphNode {
  return Object.freeze({
    id,
    prerequisites: toReadonlyRelations(node.prerequisites),
    requiredBy: toReadonlyRelations(node.requiredBy),
    related: toReadonlyRelations(node.related),
    relatedBy: toReadonlyRelations(node.relatedBy),
  });
}

/**
 * Compiles the locale-aware Content IR relation projection into one graph node
 * per Stable Content ID. Declarations from locale variants are intentionally
 * unioned here; validation rejects incompatible explicit declarations before a
 * production build can consume the graph.
 * 将带 locale 的 Content IR 关系投影编译为每个 Stable Content ID 一个节点。
 * locale 版本的声明在此合并；校验会先拦截相互冲突的显式声明。
 */
export function compileContentGraph(entries: readonly ContentRelationEntry[]): ContentGraph {
  const nodes = new Map<string, MutableContentGraphNode>();

  for (const entry of entries) {
    if (!nodes.has(entry.id)) {
      nodes.set(entry.id, createMutableNode());
    }
  }

  for (const entry of entries) {
    const source = nodes.get(entry.id);
    if (source === undefined) continue;

    for (const targetId of entry.prerequisites ?? EMPTY_RELATIONS) {
      source.prerequisites.add(targetId);
      nodes.get(targetId)?.requiredBy.add(entry.id);
    }

    for (const targetId of entry.related ?? EMPTY_RELATIONS) {
      source.related.add(targetId);
      nodes.get(targetId)?.relatedBy.add(entry.id);
    }
  }

  const finalizedNodes = new Map(
    [...nodes.entries()].map(([id, node]) => [id, finalizeNode(id, node)] as const),
  );

  return Object.freeze({
    getContentNode(id: string) {
      return finalizedNodes.get(id);
    },
    getPrerequisites(id: string) {
      return finalizedNodes.get(id)?.prerequisites ?? EMPTY_RELATIONS;
    },
    getRequiredBy(id: string) {
      return finalizedNodes.get(id)?.requiredBy ?? EMPTY_RELATIONS;
    },
    getRelated(id: string) {
      return finalizedNodes.get(id)?.related ?? EMPTY_RELATIONS;
    },
    getRelatedBy(id: string) {
      return finalizedNodes.get(id)?.relatedBy ?? EMPTY_RELATIONS;
    },
  });
}
