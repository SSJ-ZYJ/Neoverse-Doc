// Architecture boundary check: scans the TS import graph of src/ against the
// layer dependency matrix below. Lightweight by design — this codebase routes
// all cross-layer imports through the `@/` alias (verified: no cross-layer
// relative imports, dynamic imports only target npm packages), so a
// regex-level scan is reliable here. See docs/adr/0001 for the full rationale,
// docs/adr/0005 for the strict-DAG convergence, and docs/adr/0006 for the
// feature boundary rules.
// 架构边界检查：按下方层级依赖矩阵扫描 src/ 的 TS 导入图。本仓库跨层导入
// 全部使用 `@/` 别名（已验证：无跨层相对导入、动态导入仅指向 npm 包），
// 因此正则级扫描在此代码库可靠。完整决策见 docs/adr/0001，
// 严格单向 DAG 收敛见 docs/adr/0005，Feature 边界规则见 docs/adr/0006。
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

// Cross-feature allowlist: source feature → { target feature → reason }.
// Feature→feature imports are denied by default; a direct dependency that is
// itself the correct business relationship can be registered here with a
// justification. Registered or not, the import must enter via the target's
// public entry — deep paths into another feature's internals are always
// rejected. Prefer extracting the shared piece into runtime/content/lib over
// growing this list; do not introduce event buses just to dodge it.
// 跨特性许可清单：源 feature → { 目标 feature → 理由 }。
// feature→feature 默认禁止；确属正确业务关系的直接依赖可在此登记理由后
// 保留。无论是否登记，导入都必须经由目标 feature 的公共入口 —— 深入其他
// feature 内部路径一律拒绝。优先将共享实现下沉 runtime/content/lib，而非
// 扩充此清单；也不为绕开清单而引入事件总线。
const FEATURE_ALLOWLIST: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'features/community': {
    'features/transition':
      '留言板返回导航复用转场感知的 BackLink 组件，属真实业务依赖；通用导航谓词已下沉 runtime/navigation',
  },
  'features/learn': {
    'features/transition':
      'Learn 路线与文档轻量导航复用站内 TransitionLink，保持产品路线入口与现有导航转场行为一致',
  },
};

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
// Real feature→feature edges observed in the scan (keys: 'features/a→features/b'),
// regardless of whether the allowlist permitted them — cycle detection must see
// the truth, not the policy.
// 扫描所得真实 feature→feature 依赖边（键形如 'features/a→features/b'），
// 与是否获准无关 —— 环检测必须看到事实而非策略。
const realFeatureEdges = new Set<string>();
const usedFeatureAllowlist = new Set<string>();

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

/**
 * Kahn's algorithm over a directed graph: nodes that never reach in-degree
 * zero participate in (or depend on) a dependency cycle. Used both for the
 * layer matrix itself and for the real feature→feature edges collected from
 * the scan.
 * 基于有向图的 Kahn 拓扑排序：入度始终无法归零的节点参与（或依赖）循环
 * 依赖。既用于层级矩阵自检，也用于扫描所得真实 feature→feature 依赖边。
 */
function detectCycles(
  nodes: readonly string[],
  edges: readonly (readonly [source: string, target: string])[],
): string[] {
  const inDegree = new Map<string, number>(nodes.map((node) => [node, 0]));
  for (const [, target] of edges) {
    inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
  }

  const queue = nodes.filter((node) => (inDegree.get(node) ?? 0) === 0);
  const settled = new Set<string>();
  while (queue.length > 0) {
    const node = queue.shift() as string;
    settled.add(node);
    for (const [source, target] of edges) {
      if (source !== node || settled.has(target)) continue;
      const degree = (inDegree.get(target) ?? 0) - 1;
      inDegree.set(target, degree);
      if (degree === 0) queue.push(target);
    }
  }

  return nodes.filter((node) => !settled.has(node));
}

/**
 * Feature containing a src-relative file, e.g. 'features/tasks' for
 * 'features/tasks/index.ts'. Undefined for files sitting directly in
 * features/ (no enclosing feature) — no such files exist today.
 * 按 src 相对路径求出所属 feature，如 'features/tasks/index.ts' 得
 * 'features/tasks'。直接位于 features/ 根下的文件无所属 feature，
 * 返回 undefined（当前仓库不存在此类文件）。
 */
function enclosingFeature(relativePosix: string): string | undefined {
  const segments = relativePosix.split('/');
  if (segments.length < 3 || segments[1].includes('.')) return undefined;
  return `features/${segments[1]}`;
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
  const matrixEdges = Object.entries(ALLOWED).flatMap(([source, targets]) =>
    targets.filter((target) => target in ALLOWED).map((target) => [source, target] as const),
  );
  const cyclicLayers = detectCycles(Object.keys(ALLOWED), matrixEdges);
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

      // Feature boundary (cross-feature, same layer): feature→feature imports
      // are denied by default; allowlisted ones must still enter via the
      // target's public entry. Same-feature imports stay internal and free.
      // 特性边界（同层跨 feature）：feature→feature 默认禁止；获准的依赖
      // 也必须经由目标 feature 的公共入口。同 feature 内部导入不受限。
      if (sourceLayer === 'features' && targetLayer === 'features') {
        const sourceFeature = enclosingFeature(relativePosix);
        const targetFeature = segments.length >= 2 ? `features/${segments[1]}` : undefined;
        if (
          sourceFeature !== undefined &&
          targetFeature !== undefined &&
          sourceFeature !== targetFeature
        ) {
          realFeatureEdges.add(`${sourceFeature}→${targetFeature}`);
          if (segments.length > 2) {
            recordViolation(
              file,
              specifier,
              `深导入 feature 内部文件 '${targetFeature}/...'：跨 feature 只允许公共入口 '@/${targetFeature}'`,
            );
            continue;
          }
          const allowedTargets = FEATURE_ALLOWLIST[sourceFeature];
          if (allowedTargets === undefined || !(targetFeature in allowedTargets)) {
            recordViolation(
              file,
              specifier,
              `跨 feature 依赖 '${sourceFeature}' → '${targetFeature}' 默认禁止：` +
                '优先下沉 runtime/content/lib 等公共层，确属业务依赖则在 FEATURE_ALLOWLIST 登记理由',
            );
            continue;
          }
          usedFeatureAllowlist.add(`${sourceFeature}→${targetFeature}`);
        }
        continue;
      }

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

      // Barrel rule (cross-layer consumers): importing a feature from another
      // layer must target its public entry (index.ts), never deep paths into
      // internals. Cross-feature importers are handled above.
      // 桶规则（跨层消费方）：从其他层导入 feature 必须走公共入口
      // （index.ts），禁止深入内部路径。跨 feature 导入方已在上方处理。
      if (targetLayer === 'features' && segments.length > 2) {
        recordViolation(
          file,
          specifier,
          `深导入 feature 内部文件 'features/${segments[1]}/...'：请改走公共入口 '@/features/${segments[1]}'`,
        );
      }
    }
  }

  await checkUiLayerStaysCss();

  // Gate 2: real feature→feature edges (allowlisted or not) must stay acyclic —
  // a cycle means the involved features can no longer be understood, tested,
  // or released independently.
  // 门禁 2：真实 feature→feature 依赖边（无论是否获准）必须无环 —— 有环
  // 意味着相关 feature 无法再被独立理解、测试与发布。
  const featureNodes = new Set<string>();
  const featureEdgeList: (readonly [source: string, target: string])[] = [];
  for (const edge of realFeatureEdges) {
    const separatorIndex = edge.indexOf('→');
    const source = edge.slice(0, separatorIndex);
    const target = edge.slice(separatorIndex + 1);
    featureNodes.add(source);
    featureNodes.add(target);
    featureEdgeList.push([source, target]);
  }
  const cyclicFeatures = detectCycles([...featureNodes], featureEdgeList);
  if (cyclicFeatures.length > 0) {
    const involvedEdges = featureEdgeList
      .filter(
        ([source, target]) => cyclicFeatures.includes(source) && cyclicFeatures.includes(target),
      )
      .map(([source, target]) => `${source} → ${target}`)
      .join(', ');
    console.error(
      `Feature dependency cycle detected among: ${cyclicFeatures.join(', ')} ` +
        `(edges: ${involvedEdges}). Break it by extracting the shared piece into ` +
        'runtime/content/lib, or by inverting one dependency.',
    );
    process.exitCode = 1;
    return;
  }

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

  // Hygiene: cross-feature allowlist entries no longer matched by a real
  // import over-permit the boundary — remove them.
  // 卫生检查：不再被真实导入命中的跨 feature 许可会过度授权边界 —— 移除。
  const totalAllowlistEntries = Object.values(FEATURE_ALLOWLIST).reduce(
    (sum, targets) => sum + Object.keys(targets).length,
    0,
  );
  for (const [source, targets] of Object.entries(FEATURE_ALLOWLIST)) {
    for (const target of Object.keys(targets)) {
      if (!usedFeatureAllowlist.has(`${source}→${target}`)) {
        warnings.push(`跨 feature 许可已失效，请从 FEATURE_ALLOWLIST 移除：${source} → ${target}`);
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
        'Rules: scripts/check-architecture.ts · Exceptions & rationale: docs/adr/0001 · DAG convergence: docs/adr/0005 · Feature boundary: docs/adr/0006',
    );
    process.exitCode = 1;
    return;
  }

  console.info(
    `Architecture check passed: ${files.length} files, ${crossLayerImports} cross-layer imports, ` +
      `${realFeatureEdges.size} cross-feature import(s), ` +
      `${usedFeatureAllowlist.size}/${totalAllowlistEntries} feature allowlist entries active, ` +
      `${usedEdges.size}/${totalEdges} matrix edges active, ` +
      `${usedExceptions.size}/${Object.values(EXCEPTIONS).reduce((sum, entry) => sum + Object.keys(entry).length, 0)} exceptions active.`,
  );
}

await main();
