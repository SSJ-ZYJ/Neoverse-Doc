// Architecture boundary check: scans the TS import graph of src/ against the
// layer dependency matrix below. Lightweight by design — this codebase routes
// all cross-layer imports through the `@/` alias (verified: no cross-layer
// relative imports, dynamic imports only target npm packages), so a
// regex-level scan is reliable here. See docs/adr/0001 for the full rationale.
// 架构边界检查：按下方层级依赖矩阵扫描 src/ 的 TS 导入图。本仓库跨层导入
// 全部使用 `@/` 别名（已验证：无跨层相对导入、动态导入仅指向 npm 包），
// 因此正则级扫描在此代码库可靠。完整决策见 docs/adr/0001。
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const SRC_ROOT = path.join(process.cwd(), 'src');

// Layer dependency matrix: source layer → allowed target layers.
// 层级依赖矩阵：源层 → 允许的目标层集合。
//
//   app         → all（组合层）
//   components  → 迁移过渡期共享组件，可消费除 adapters/app 外的层
//   features    → 产品特性，可消费 runtime/content/ui/adapters 与纯公共层
//   runtime     → 交互/动效/导航运行时，仅消费 adapters 与纯公共层
//   content     → 内容基础设施，仅消费 adapters（外部内容源）与纯公共层
//   adapters    → 第三方适配，仅消费纯公共层（lib）
//   lib         → 站点胶水，可消费 adapters 与 dictionaries
//   dictionaries→ 字典叶子层，仅消费 lib（与 lib 构成唯一有意双向对）
//   ui/styles   → 纯样式资产层，仅作为目标存在
//
// lib/dictionaries 承载 i18n 配置与文案，按“纯公共能力”原则对下层开放。
// Unknown target layers fail loudly so a new top-level directory must be
// registered here consciously.
// 未知目标层会直接报错，强制新顶层目录显式登记进矩阵。
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
  components: ['features', 'runtime', 'content', 'ui', 'lib', 'dictionaries'],
  features: ['runtime', 'content', 'ui', 'adapters', 'lib', 'dictionaries'],
  runtime: ['adapters', 'ui', 'lib', 'dictionaries'],
  content: ['adapters', 'lib'],
  adapters: ['lib'],
  lib: ['adapters', 'dictionaries'],
  dictionaries: ['lib'],
  ui: [],
  styles: [],
};

// Documented exceptions: file (relative to src/) → { import specifier → reason }.
// Exceptions stay visible in this list instead of silently loosening the matrix.
// 记录在案的例外：文件（相对 src/）→ { 导入说明符 → 理由 }。
// 例外集中可见，不悄悄放宽矩阵。
const EXCEPTIONS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'adapters/fumadocs/deferred-toc-state.ts': {
    '@/runtime/navigation/store':
      '将 Fumadocs TOC 状态桥接进项目导航运行时：适配器向运行时写入，而非消费上层模块。',
  },
  'adapters/fumadocs/deferred-docs-page.tsx': {
    '@/runtime/navigation/use-navigation':
      '向 Fumadocs 延迟渲染的文档页注入项目导航状态，属适配器桥接职责。',
  },
  'adapters/fumadocs/layout.tsx': {
    '@/components/nav-title': '组合 Fumadocs RootLayout 与站点导航标题，布局适配器是组合点。',
    '@/dictionaries': '布局适配器组装站点外壳需要字典文案。',
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

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join('/');
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
        'Rules: scripts/check-architecture.ts · Exceptions & rationale: docs/adr/0001',
    );
    process.exitCode = 1;
    return;
  }

  console.info(
    `Architecture check passed: ${files.length} files, ${crossLayerImports} cross-layer imports, ` +
      `${usedExceptions.size}/${Object.values(EXCEPTIONS).reduce((sum, entry) => sum + Object.keys(entry).length, 0)} exceptions active.`,
  );
}

await main();
