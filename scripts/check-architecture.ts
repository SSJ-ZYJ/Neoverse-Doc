// Architecture boundary check: scans the TS import graph of src/ against the
// layer dependency matrix below. Lightweight by design — this codebase routes
// all cross-layer imports through the `@/` alias (verified: no cross-layer
// relative imports, dynamic imports only target npm packages), so a
// regex-level scan is reliable here. See docs/adr/0001 for the full rationale
// and docs/adr/0005 for the strict-DAG convergence.
// 架构边界检查：按下方层级依赖矩阵扫描 src/ 的 TS 导入图。本仓库跨层导入
// 全部使用 `@/` 别名（已验证：无跨层相对导入、动态导入仅指向 npm 包），
// 因此正则级扫描在此代码库可靠。完整决策见 docs/adr/0001，
// 严格单向 DAG 收敛见 docs/adr/0005。
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const SRC_ROOT = path.join(process.cwd(), 'src');

// Layer dependency matrix: source layer → allowed target layers.
// The matrix must stay a strict single-direction DAG — no layer pair may
// reference each other, which detectLayerCycles() enforces at startup.
// 层级依赖矩阵：源层 → 允许的目标层集合。
// 矩阵必须保持严格单向 DAG —— 任意两层不得互相引用，由 detectLayerCycles() 启动时强制校验。
//
//   app         → all（组合层，不被任何层依赖；ui/styles 仅经 CSS 入口消费）
//   components  → 迁移过渡期共享组件，可消费除 adapters/app 外的层
//   features    → 产品特性，可消费 runtime/content/adapters 与纯公共层
//   runtime     → 交互/动效/导航运行时，仅消费 adapters
//   content     → 内容基础设施，仅消费 adapters（外部内容源）与纯公共层
//   adapters    → 第三方适配，仅消费纯公共层（lib）
//   lib         → 纯工具层，不依赖任何项目层（叶子）
//   dictionaries→ 字典叶子层，仅消费 lib
//   ui/styles   → 纯样式资产层，仅作为目标存在
//
// Unknown target layers fail loudly so a new top-level directory must be
// registered here consciously. Unused allowed edges are flagged as warnings
// so the matrix cannot over-permit silently.
// 未知目标层会直接报错，强制新顶层目录显式登记进矩阵；
// 零引用的允许边给出警告，避免矩阵悄悄过度授权。
const ALLOWED: Readonly<Record<string, readonly string[]>> = {
  app: [
    'features',
    'runtime',
    'content',
    'ui',
    'adapters',
    'components',
    'lib',
    'dictionaries',
    'styles',
  ],
  components: ['features', 'runtime', 'content', 'lib', 'dictionaries'],
  features: ['runtime', 'content', 'adapters', 'lib', 'dictionaries'],
  runtime: ['adapters'],
  content: ['adapters', 'lib', 'dictionaries'],
  adapters: ['lib'],
  lib: [],
  dictionaries: ['lib'],
  ui: [],
  styles: [],
};

// Edges consumed only via CSS @import (src/app/globals.css → ui/*): the TS
// import scan cannot see them, so they are exempt from the unused-edge
// warning but stay declared here for visibility.
// 仅经 CSS @import 消费的边（src/app/globals.css → ui/*）：TS 导入扫描
// 不可见，因此豁免零引用警告，但仍在此登记以保持可见。
const CSS_CONSUMED_EDGES = new Set(['app→ui']);

// Documented exceptions: file (relative to src/) → { import specifier → reason }.
// Exceptions stay visible in this list instead of silently loosening the matrix.
// Kept empty after the ADR 0005 DAG convergence — new entries require a reason
// strong enough to justify breaking the single-direction layer flow.
// 记录在案的例外：文件（相对 src/）→ { 导入说明符 → 理由 }。
// 例外集中可见，不悄悄放宽矩阵。ADR 0005 DAG 收敛后清零 ——
// 新增条目必须有足以打破单向分层的充分理由。
const EXCEPTIONS: Readonly<Record<string, Readonly<Record<string, string>>>> = {};

// Generated infrastructure consumed via alias, not a hand-written layer.
// 经别名消费的生成基础设施，不属于手写层，跳过。
const IGNORED_PREFIXES = ['@/.source'];

const FROM_RE = /\bfrom\s+['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const SIDE_EFFECT_IMPORT_RE = /^\s*import\s+['"]([^'"]+)['"]/gm;

interface Violation {
  file: string;
  specifier: string;
  message: string;
}

const violations: Violation[] = [];
const warnings: string[] = [];
const usedExceptions = new Set<string>();
const usedEdges = new Set<string>();

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

/**
 * Kahn's algorithm over the layer graph: layers that never reach in-degree
 * zero participate in (or depend on) a dependency cycle. The matrix must be
 * a strict DAG, so any remaining layer is a hard failure.
 * 基于层级图的 Kahn 拓扑排序：入度始终无法归零的层参与（或依赖）循环依赖。
 * 矩阵必须是严格 DAG，因此任何残留层都直接判定失败。
 */
function detectLayerCycles(allowed: Readonly<Record<string, readonly string[]>>): string[] {
  const layers = Object.keys(allowed);
  const registered = new Set(layers);
  const edges: readonly (readonly [source: string, target: string])[] = layers.flatMap((source) =>
    (allowed[source] ?? [])
      .filter((target) => registered.has(target))
      .map((target) => [source, target] as const),
  );

  const inDegree = new Map<string, number>(layers.map((layer) => [layer, 0]));
  for (const [, target] of edges) {
    inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
  }

  const queue = layers.filter((layer) => (inDegree.get(layer) ?? 0) === 0);
  const settled = new Set<string>();
  while (queue.length > 0) {
    const layer = queue.shift() as string;
    settled.add(layer);
    for (const [source, target] of edges) {
      if (source !== layer || settled.has(target)) continue;
      const degree = (inDegree.get(target) ?? 0) - 1;
      inDegree.set(target, degree);
      if (degree === 0) queue.push(target);
    }
  }

  return layers.filter((layer) => !settled.has(layer));
}

function layerOfSegments(segments: readonly string[]): string | undefined {
  return segments[0];
}

/** Resolve a specifier to [layer, remaining path segments] or undefined to skip. */
function resolveSpecifier(
  specifier: string,
  importerDirPosix: string,
): { layer: string; segments: string[] } | undefined {
  if (
    IGNORED_PREFIXES.some((prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`))
  ) {
    return undefined;
  }

  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const resolved = path.posix.normalize(path.posix.join(importerDirPosix, specifier));
    const segments = resolved.split('/').filter((segment) => segment !== '');
    if (segments.length === 0) return undefined;
    return { layer: segments[0], segments };
  }

  if (specifier.startsWith('@/')) {
    const segments = specifier
      .slice(2)
      .split('/')
      .filter((segment) => segment !== '');
    if (segments.length === 0) return undefined;
    return { layer: segments[0], segments };
  }

  // npm package (bare or scoped like @fuma-translate/react)
  return undefined;
}

async function collectSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectSourceFiles(entryPath);
      return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
    }),
  );
  return nested.flat();
}

function collectSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  for (const regex of [FROM_RE, DYNAMIC_IMPORT_RE, SIDE_EFFECT_IMPORT_RE]) {
    regex.lastIndex = 0;
    let match = regex.exec(source);
    while (match !== null) {
      specifiers.push(match[1]);
      match = regex.exec(source);
    }
  }
  return specifiers;
}

function recordViolation(file: string, specifier: string, message: string): void {
  const fileExceptions = EXCEPTIONS[toPosix(path.relative(SRC_ROOT, file))];
  if (fileExceptions !== undefined && specifier in fileExceptions) {
    usedExceptions.add(`${toPosix(path.relative(SRC_ROOT, file))} → ${specifier}`);
    return;
  }
  violations.push({ file: toPosix(path.relative(SRC_ROOT, file)), specifier, message });
}

async function checkUiLayerStaysCss(): Promise<void> {
  const uiRoot = path.join(SRC_ROOT, 'ui');
  try {
    await stat(uiRoot);
  } catch {
    return; // layer absent — nothing to check
  }
  const files = await collectSourceFiles(uiRoot);
  for (const file of files) {
    violations.push({
      file: toPosix(path.relative(SRC_ROOT, file)),
      specifier: '',
      message: "ui 层必须保持纯 CSS：不得新增 .ts/.tsx（'ui' layer must stay CSS-only)",
    });
  }
}

async function main(): Promise<void> {
  // Gate 1: the matrix itself must be an acyclic layer DAG before any file
  // scan makes sense — a cyclic matrix cannot define "upper" or "lower".
  // 门禁 1：矩阵自身必须是无环层级 DAG，否则“上下层”无从谈起。
  const cyclicLayers = detectLayerCycles(ALLOWED);
  if (cyclicLayers.length > 0) {
    console.error(
      `Architecture matrix is not a DAG. Layers in (or depending on) a cycle: ${cyclicLayers.join(' → ')}. ` +
        'Remove the reverse edge in ALLOWED (scripts/check-architecture.ts).',
    );
    process.exitCode = 1;
    return;
  }

  const files = (await collectSourceFiles(SRC_ROOT)).sort();
  let crossLayerImports = 0;

  for (const file of files) {
    const relativePosix = toPosix(path.relative(SRC_ROOT, file));
    const sourceLayer = layerOfSegments(relativePosix.split('/'));
    if (sourceLayer === undefined || !(sourceLayer in ALLOWED)) {
      violations.push({
        file: relativePosix,
        specifier: '',
        message: `文件位于未登记的层 '${sourceLayer ?? '(none)'}'，请在 ALLOWED 矩阵中登记或移动文件`,
      });
      continue;
    }

    const importerDirPosix = path.posix.dirname(relativePosix);
    const source = await readFile(file, 'utf8');

    for (const specifier of collectSpecifiers(source)) {
      const resolved = resolveSpecifier(specifier, importerDirPosix);
      if (resolved === undefined) continue;
      const { layer: targetLayer, segments } = resolved;
      if (targetLayer === sourceLayer) continue;
      crossLayerImports += 1;

      if (!(targetLayer in ALLOWED)) {
        recordViolation(
          file,
          specifier,
          `未知目标层 '${targetLayer}'：请登记进 ALLOWED 矩阵或修正导入`,
        );
        continue;
      }

      const allowed = ALLOWED[sourceLayer];
      if (!allowed.includes(targetLayer)) {
        recordViolation(
          file,
          specifier,
          `层 '${sourceLayer}' 不得导入层 '${targetLayer}'（允许：${allowed.join(', ') || '无'}）`,
        );
        continue;
      }

      usedEdges.add(`${sourceLayer}→${targetLayer}`);

      // Barrel rule: cross-boundary consumers of a feature must use its public
      // entry (index.ts), never deep paths into internals. Same-feature deep
      // imports are internal and fine.
      // 桶规则：跨边界消费 feature 必须走公共入口（index.ts），禁止深入内部
      // 路径；同 feature 内部深导入不受限。
      if (targetLayer === 'features' && segments.length > 2) {
        const targetFeature = `features/${segments[1]}`;
        const importerFeaturePrefix =
          importerDirPosix.startsWith(targetFeature) ||
          relativePosix.startsWith(`${targetFeature}/`);
        if (!importerFeaturePrefix) {
          recordViolation(
            file,
            specifier,
            `深导入 feature 内部文件 '${targetFeature}/...'：请改走公共入口 '@/${targetFeature}'`,
          );
        }
      }
    }
  }

  await checkUiLayerStaysCss();

  // Hygiene: flag exception entries that no longer match reality so the
  // allowlist cannot rot silently.
  // 卫生检查：不再匹配现实的例外条目给出警告，避免清单悄悄腐化。
  for (const [file, specifiers] of Object.entries(EXCEPTIONS)) {
    for (const specifier of Object.keys(specifiers)) {
      const key = `${file} → ${specifier}`;
      if (!usedExceptions.has(key)) {
        warnings.push(`例外已失效，请从 EXCEPTIONS 移除：${key}`);
      }
    }
  }

  // Hygiene: allowed edges without any real import over-permit the matrix —
  // prune them so the matrix keeps describing the actual DAG. CSS-consumed
  // edges are exempt (see CSS_CONSUMED_EDGES).
  // 卫生检查：零引用的允许边会让矩阵过度授权 —— 剪除后矩阵才能描述真实
  // DAG。仅经 CSS 消费的边豁免（见 CSS_CONSUMED_EDGES）。
  const totalEdges = Object.values(ALLOWED).reduce((sum, targets) => sum + targets.length, 0);
  for (const [source, targets] of Object.entries(ALLOWED)) {
    for (const target of targets) {
      const edge = `${source}→${target}`;
      if (!usedEdges.has(edge) && !CSS_CONSUMED_EDGES.has(edge)) {
        warnings.push(`允许边零引用，请从矩阵剪除：${source} → ${target}`);
      }
    }
  }

  for (const warning of warnings) {
    console.warn(`Architecture check warning: ${warning}`);
  }

  if (violations.length > 0) {
    for (const violation of violations) {
      const target = violation.specifier ? ` → ${violation.specifier}` : '';
      console.error(
        `Architecture violation: src/${violation.file}${target}\n  ${violation.message}`,
      );
    }
    console.error(
      `\nArchitecture check failed: ${violations.length} violation(s) across ${files.length} files. ` +
        'Rules: scripts/check-architecture.ts · Exceptions & rationale: docs/adr/0001 · DAG convergence: docs/adr/0005',
    );
    process.exitCode = 1;
    return;
  }

  console.info(
    `Architecture check passed: ${files.length} files, ${crossLayerImports} cross-layer imports, ` +
      `${usedEdges.size}/${totalEdges} matrix edges active, ` +
      `${usedExceptions.size}/${Object.values(EXCEPTIONS).reduce((sum, entry) => sum + Object.keys(entry).length, 0)} exceptions active.`,
  );
}

await main();
