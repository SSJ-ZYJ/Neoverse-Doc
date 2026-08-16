import type { ContentRelationEntry, ContentRelationField, ContentRelationViolation } from './types';
import { CONTENT_RELATION_FIELDS } from './types';

interface RelationDeclaration {
  locale: string;
  sourcePath?: string;
  references: readonly string[];
}

function normalizedReferences(references: readonly string[]): string[] {
  return [...new Set(references)].sort();
}

function formatReferences(references: readonly string[]): string {
  return references.length > 0 ? references.join(', ') : '（空）';
}

function addRelationDeclaration(
  declarationsById: Map<string, Map<ContentRelationField, RelationDeclaration[]>>,
  entry: ContentRelationEntry,
  field: ContentRelationField,
): void {
  const references = entry[field];
  if (references === undefined) return;

  let declarationsByField = declarationsById.get(entry.id);
  if (declarationsByField === undefined) {
    declarationsByField = new Map();
    declarationsById.set(entry.id, declarationsByField);
  }

  const declarations = declarationsByField.get(field) ?? [];
  declarations.push({
    locale: entry.locale,
    ...(entry.sourcePath !== undefined ? { sourcePath: entry.sourcePath } : {}),
    references,
  });
  declarationsByField.set(field, declarations);
}

function findLocaleRelationConflicts(
  entries: readonly ContentRelationEntry[],
): ContentRelationViolation[] {
  const declarationsById = new Map<string, Map<ContentRelationField, RelationDeclaration[]>>();

  for (const entry of entries) {
    for (const field of CONTENT_RELATION_FIELDS) {
      addRelationDeclaration(declarationsById, entry, field);
    }
  }

  const violations: ContentRelationViolation[] = [];
  for (const [id, declarationsByField] of declarationsById) {
    for (const [field, declarations] of declarationsByField) {
      const distinctSets = new Set(
        declarations.map((declaration) =>
          normalizedReferences(declaration.references).join('\u0000'),
        ),
      );
      if (distinctSets.size <= 1) continue;

      const detail = declarations
        .map(
          (declaration) =>
            `${declaration.locale}=[${formatReferences(normalizedReferences(declaration.references))}]`,
        )
        .join(', ');
      violations.push({
        identity: id,
        field,
        message: `同一 Content ID 的 locale 版本在 ${field} 声明不一致（${detail}）`,
        ...(declarations[0]?.sourcePath !== undefined
          ? { sourcePath: declarations[0].sourcePath }
          : {}),
      });
    }
  }

  return violations;
}

function findPrerequisiteCycles(
  entries: readonly ContentRelationEntry[],
  knownIds: ReadonlySet<string>,
): ContentRelationViolation[] {
  const sourcePathsById = new Map(
    entries.flatMap((entry) =>
      entry.sourcePath === undefined ? [] : [[entry.id, entry.sourcePath] as const],
    ),
  );
  const edges = new Map<string, Set<string>>(
    [...knownIds].map((id) => [id, new Set<string>()] as const),
  );

  for (const entry of entries) {
    const targets = edges.get(entry.id);
    if (targets === undefined) continue;
    for (const targetId of entry.prerequisites ?? []) {
      if (targetId !== entry.id && knownIds.has(targetId)) {
        targets.add(targetId);
      }
    }
  }

  const state = new Map<string, 'visiting' | 'visited'>();
  const stack: string[] = [];
  const reportedCycles = new Set<string>();
  const violations: ContentRelationViolation[] = [];

  function reportCycle(targetId: string): void {
    const startIndex = stack.indexOf(targetId);
    if (startIndex < 0) return;

    const cycle = [...stack.slice(startIndex), targetId];
    const ring = cycle.slice(0, -1);
    const key = ring
      .map((_, index) => [...ring.slice(index), ...ring.slice(0, index)].join('\u0000'))
      .sort()[0];
    if (reportedCycles.has(key)) return;

    reportedCycles.add(key);
    const sourcePath = sourcePathsById.get(cycle[0]);
    violations.push({
      identity: cycle[0],
      field: 'prerequisites',
      message: `前置关系形成环：${cycle.join(' → ')}`,
      ...(sourcePath !== undefined ? { sourcePath } : {}),
    });
  }

  function visit(id: string): void {
    state.set(id, 'visiting');
    stack.push(id);

    const targets = [...(edges.get(id) ?? [])].sort();
    for (const targetId of targets) {
      const targetState = state.get(targetId);
      if (targetState === 'visiting') {
        reportCycle(targetId);
      } else if (targetState === undefined) {
        visit(targetId);
      }
    }

    stack.pop();
    state.set(id, 'visited');
  }

  for (const id of [...knownIds].sort()) {
    if (state.get(id) === undefined) visit(id);
  }

  return violations;
}

/**
 * Validates graph relations after schema validation has produced Content IR.
 * It intentionally does not scan raw MDX, so all build-time consumers share
 * the same normalized data plane.
 * 在 Schema 生成 Content IR 后校验图关系；不重新扫描原始 MDX。
 */
export function validateContentRelations(
  entries: readonly ContentRelationEntry[],
): ContentRelationViolation[] {
  const knownIds = new Set(entries.map((entry) => entry.id));
  const violations: ContentRelationViolation[] = [];

  for (const entry of entries) {
    for (const field of CONTENT_RELATION_FIELDS) {
      const references = entry[field];
      if (references === undefined) continue;

      const seenReferences = new Set<string>();
      for (const reference of references) {
        if (seenReferences.has(reference)) {
          violations.push({
            identity: `${entry.id}:${entry.locale}`,
            field,
            message: `重复引用 '${reference}'：同一关系字段内每个 Content ID 只能出现一次`,
            ...(entry.sourcePath !== undefined ? { sourcePath: entry.sourcePath } : {}),
          });
        }
        seenReferences.add(reference);

        if (reference === entry.id) {
          violations.push({
            identity: `${entry.id}:${entry.locale}`,
            field,
            message: `自引用 '${reference}'：内容不应以自身为前置或相关项`,
            ...(entry.sourcePath !== undefined ? { sourcePath: entry.sourcePath } : {}),
          });
        }
        if (!knownIds.has(reference)) {
          violations.push({
            identity: `${entry.id}:${entry.locale}`,
            field,
            message: `引用了不存在的 Content ID '${reference}'（任意 locale 均无此内容）`,
            ...(entry.sourcePath !== undefined ? { sourcePath: entry.sourcePath } : {}),
          });
        }
      }
    }
  }

  violations.push(...findLocaleRelationConflicts(entries));
  violations.push(...findPrerequisiteCycles(entries, knownIds));

  return violations;
}
