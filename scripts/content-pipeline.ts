// Content pipeline: the single build-time entry that derives the Content IR,
// validates content relations, and manages mermaid assets. Two modes:
//
//   generate (bun run generate:content) — dev / content preparation. Derives
//     the IR, runs all content validations, then incrementally renders only
//     changed mermaid assets (content-addressed by source + renderer +
//     config hash). Puppeteer is imported lazily and only when something is
//     actually pending.
//   verify (bun run check:content) — production build gate. Derives the IR,
//     runs the same validations, then hash-checks the mermaid asset manifest
//     against the IR and the files on disk. Never imports puppeteer, never
//     launches a browser; missing or stale assets fail the build with a hint
//     to run generate. See docs/adr/0004.
//
// 内容管线：派生 Content IR、校验内容关系并管理 Mermaid 资产的唯一构建期
// 入口。两种模式：
//
//   generate（bun run generate:content）—— 开发 / 内容准备阶段。派生 IR、
//     执行全部内容校验，然后按「源码 + 渲染器 + 配置」哈希内容寻址，仅
//     渲染发生变化的 Mermaid 资产。puppeteer 惰性导入，且仅在确有待渲染
//     项时加载。
//   verify（bun run check:content）—— 生产构建门禁。派生 IR、执行相同
//     校验，然后按 IR 与磁盘文件对 Mermaid 资产清单做哈希对账。绝不导入
//     puppeteer、绝不启动浏览器；资产缺失或过期时使构建失败并提示运行
//     generate。见 docs/adr/0004。
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createMdxPlugin } from 'fumadocs-mdx/bun';
import {
  ASSET_ROOT,
  assetExists,
  computeRendererSignature,
  createAssetName,
  createManifestSource,
  dedupeCharts,
  MANIFEST_PATH,
  removeStaleGeneratedAssets,
} from './mermaid-assets';

// Narrow local view of the Bun global — avoids a bun-types devDependency for
// one call site. The script only ever runs under Bun (see generate:content /
// check:content scripts).
// Bun 全局类型的窄化本地视图 —— 避免为单一调用点引入 bun-types 开发依赖。
// 本脚本只在 Bun 下运行（见 generate:content / check:content 脚本）。
interface BunGlobal {
  plugin: (plugin: unknown) => Promise<unknown>;
}
const bunGlobal = (globalThis as { Bun?: BunGlobal }).Bun;

if (bunGlobal === undefined) {
  console.error('Content pipeline must run under Bun: Bun.plugin is unavailable.');
  process.exit(1);
}

const mode = process.argv[2];
if (mode !== 'generate' && mode !== 'verify') {
  console.error('Usage: bun scripts/content-pipeline.ts <generate|verify>');
  process.exit(1);
}

// Phase timing uses the monotonic hrtime clock: on some Windows hosts both
// wall-clock and performance.now() deltas were observed inflating wildly
// under build load, while hrtime stayed accurate. Timings are best-effort
// diagnostics, never correctness inputs.
// 阶段计时使用单调 hrtime 时钟：某些 Windows 宿主在构建负载下曾出现
// 墙钟与 performance.now() 差值严重虚高的现象，而 hrtime 保持准确。
// 计时是尽力而为的诊断信息，绝不参与正确性判断。
function elapsedSeconds(startedAtNs: bigint): string {
  return (Number(process.hrtime.bigint() - startedAtNs) / 1e9).toFixed(2);
}

// Peak resident set of this script only; the headless Chromium spawned for
// rendering is a separate process and is not visible here.
// 仅统计本脚本进程的峰值驻留内存；渲染用的无头 Chromium 是独立进程，不在此列。
function maxRssMb(): number {
  const usage = typeof process.resourceUsage === 'function' ? process.resourceUsage() : undefined;
  const maxRssBytes = usage ? usage.maxRSS * 1024 : process.memoryUsage().rss;
  return Math.round(maxRssBytes / 1024 / 1024);
}

const totalStartedAt = process.hrtime.bigint();

// --- Stage 1: Content IR (single source-derived normalization) -------------
await bunGlobal.plugin(createMdxPlugin());
const irStartedAt = process.hrtime.bigint();
const { contentIr, countMermaidDiagrams } = await import('../src/content/ir');
const diagramCount = countMermaidDiagrams(contentIr);
console.info(
  `Content IR: ${contentIr.length} entries, ${diagramCount} mermaid diagram(s) (${elapsedSeconds(irStartedAt)}s).`,
);

// --- Stage 2: Content validation (whole-content view) -----------------------
// Enum / format / numeric constraints live in the zod schema and are enforced
// wherever frontmatter is compiled; these checks need the whole-content view:
//   1. Content ID uniqueness (per id + locale)
//   2. translation pairing contract: locale variants sharing one stable id
//      must live at the same slugs
//   3. prerequisites / related reference existence (locale-loose)
//   4. duplicate and self-reference guards
//   5. locale-variant relation consistency and prerequisite DAG cycles
// 枚举 / 格式 / 数值约束位于 zod schema，在 frontmatter 编译处强制；
// 以下检查需要全量内容视角：
//   1. Content ID 唯一性（id + locale 维度）
//   2. 翻译配对契约：共享同一稳定 id 的各语言版本必须位于相同 slugs
//   3. prerequisites / related 引用存在性（宽松 locale 语义）
//   4. 重复引用与自引用防护
//   5. locale 版本关系一致性与 prerequisite DAG 环检测
interface Violation {
  identity: string;
  field: string;
  message: string;
}

const violations: Violation[] = [];

const seenIdentities = new Set<string>();
for (const entry of contentIr) {
  const identity = `${entry.id}:${entry.locale}`;
  if (seenIdentities.has(identity)) {
    violations.push({
      identity,
      field: 'id',
      message: 'Content ID 在同一 locale 下重复，请检查文件组织',
    });
  }
  seenIdentities.add(identity);
}

// The stable id is locale-independent by design, but fumadocs dir-based i18n
// pairing still resolves translations from symmetric paths. Make that implicit
// dependency an explicit contract: locale variants sharing an id must share
// the same slugs, otherwise page tree / alternates / routing silently split.
// 稳定 id 按设计与 locale 无关，但 fumadocs 目录式 i18n 配对仍从路径对称性
// 解析翻译。把这一隐式依赖升级为显式契约：共享同一 id 的各语言版本必须
// 位于相同 slugs，否则 page tree / alternates / 路由会静默分裂。
const slugPathsById = new Map<string, Map<string, string[]>>();
for (const entry of contentIr) {
  let variants = slugPathsById.get(entry.id);
  if (variants === undefined) {
    variants = new Map();
    slugPathsById.set(entry.id, variants);
  }
  variants.set(entry.locale, entry.slugs);
}
for (const [id, variants] of slugPathsById) {
  const distinctPaths = new Set([...variants.values()].map((slugs) => slugs.join('/')));
  if (distinctPaths.size > 1) {
    const detail = [...variants.entries()]
      .map(([locale, slugs]) => `${locale}=${slugs.join('/')}`)
      .join(', ');
    violations.push({
      identity: id,
      field: 'id',
      message: `同一稳定 id 的各语言版本 slugs 不一致（${detail}）；翻译配对要求路径对称，请移动文件或拆分 id`,
    });
  }
}

const { validateContentRelations } = await import('../src/content/graph/validation');
violations.push(...validateContentRelations(contentIr));

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(
      `Content check violation: [${violation.identity}] ${violation.field}\n  ${violation.message}`,
    );
  }
  console.error(
    `\nContent check failed: ${violations.length} violation(s) across ${contentIr.length} IR entries. ` +
      'Rules: scripts/content-pipeline.ts · Schema: src/content/schema/docs.ts · Decisions: docs/adr/0002, docs/adr/0003, docs/adr/0004, docs/adr/0007',
  );
  process.exit(1);
}

const relations = contentIr.reduce(
  (sum, entry) => sum + (entry.prerequisites?.length ?? 0) + (entry.related?.length ?? 0),
  0,
);
const annotated = contentIr.filter((entry) => entry.type !== undefined).length;
console.info(
  `Content check passed: ${contentIr.length} entries, ${annotated} typed page(s), ` +
    `${relations} relation reference(s), all relation rules satisfied.`,
);

// --- Stage 3: Mermaid assets ------------------------------------------------
const charts = dedupeCharts(contentIr.flatMap((entry) => entry.mermaid));
const rendererSignature = await computeRendererSignature();

if (mode === 'generate') {
  let renderSeconds = '0';
  const renderStartedAt = process.hrtime.bigint();

  await mkdir(ASSET_ROOT, { recursive: true });
  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });

  const manifest = new Map<string, string>();
  const pending: Array<{ sourceId: string; source: string; fileName: string }> = [];
  for (const chart of charts.values()) {
    const fileName = createAssetName(chart.source, rendererSignature);
    manifest.set(chart.sourceId, fileName);
    if (!(await assetExists(fileName))) {
      pending.push({ sourceId: chart.sourceId, source: chart.source, fileName });
    }
  }

  let generatedCount = 0;
  if (pending.length > 0) {
    // Lazy import keeps puppeteer (and its Chromium download) out of verify
    // runs and every production build.
    // 惰性导入使 puppeteer（及其 Chromium 下载）不进入 verify 与所有生产构建。
    const { renderMermaidBatch } = await import('./mermaid-renderer');
    const rendered = await renderMermaidBatch(pending);
    for (const item of pending) {
      const svg = rendered.get(item.sourceId);
      if (svg === undefined) throw new Error(`Renderer returned no SVG for ${item.sourceId}`);
      await writeFile(path.join(ASSET_ROOT, item.fileName), svg, 'utf8');
      generatedCount += 1;
    }
    renderSeconds = elapsedSeconds(renderStartedAt);
  }

  const cleanupStartedAt = process.hrtime.bigint();
  await writeFile(MANIFEST_PATH, createManifestSource(manifest), 'utf8');
  const removed = await removeStaleGeneratedAssets(new Set(manifest.values()));

  console.info(
    `Mermaid assets: ${charts.size} total, ${generatedCount} generated, ${charts.size - pending.length} reused, ${removed} stale removed ` +
      `(render ${renderSeconds}s, cleanup ${elapsedSeconds(cleanupStartedAt)}s, total ${elapsedSeconds(totalStartedAt)}s, max rss ${maxRssMb()}MB).`,
  );
} else {
  const { MERMAID_ASSET_PATHS } = await import('../src/features/mermaid/generated/assets');
  const problems: string[] = [];

  for (const chart of charts.values()) {
    const expectedName = createAssetName(chart.source, rendererSignature);
    const publishedName = MERMAID_ASSET_PATHS[chart.sourceId];
    if (publishedName === undefined) {
      problems.push(`资产清单缺少图表 ${chart.sourceId}（期望 ${expectedName}）`);
      continue;
    }
    if (publishedName !== expectedName) {
      problems.push(
        `图表 ${chart.sourceId} 哈希不匹配：清单为 ${publishedName}，期望 ${expectedName}（渲染器 / 配置 / 源码已变化）`,
      );
      continue;
    }
    if (!(await assetExists(publishedName))) {
      problems.push(`资产文件缺失：${publishedName}（图表 ${chart.sourceId}）`);
    }
  }

  const chartIds = new Set(charts.keys());
  for (const sourceId of Object.keys(MERMAID_ASSET_PATHS)) {
    if (!chartIds.has(sourceId)) {
      problems.push(`资产清单包含孤儿条目 ${sourceId}（内容中已不存在该图表）`);
    }
  }

  if (problems.length > 0) {
    for (const problem of problems) {
      console.error(`Mermaid verify violation: ${problem}`);
    }
    console.error(
      `\nMermaid verify failed: ${problems.length} problem(s) across ${charts.size} diagram(s). ` +
        "Run 'bun run generate:content' to render missing or changed assets.",
    );
    process.exit(1);
  }

  console.info(
    `Mermaid verify passed: ${charts.size} diagram(s), manifest hash-matched, all assets present (${elapsedSeconds(totalStartedAt)}s, max rss ${maxRssMb()}MB).`,
  );
}
