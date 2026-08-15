// Lightweight post-build artifact verification: catches silent degradation of
// the static export (missing pages, unusable search index, Mermaid charts that
// fell back to client rendering) before the output ships.
// 轻量构建产物校验：在静态产物发布前捕获静默降级（缺页、搜索索引不可用、
// Mermaid 图退回客户端渲染等）。
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { MERMAID_ASSET_PATHS } from '../src/features/mermaid/generated/assets';

const OUT_ROOT = path.join(process.cwd(), 'out');

// Tripwire against a catastrophically incomplete export, not an exact page
// count expectation. The site currently exports ~75 HTML pages.
// 该下限仅用于拦截灾难性不完整的导出，不是精确页数预期；当前站点约 75 页。
const MIN_HTML_PAGES = 10;

const failures: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

async function fileSize(entryPath: string): Promise<number> {
  const info = await stat(entryPath);
  return info.size;
}

async function exists(entryPath: string): Promise<boolean> {
  try {
    await stat(entryPath);
    return true;
  } catch {
    return false;
  }
}

async function countHtmlFiles(directory: string): Promise<number> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return countHtmlFiles(entryPath);
      return entry.name.endsWith('.html') ? 1 : 0;
    }),
  );
  return nested.reduce((sum, count) => sum + count, 0);
}

async function formatMegabytes(entryPath: string): Promise<string> {
  return `${((await fileSize(entryPath)) / 1024 / 1024).toFixed(1)}MB`;
}

async function main(): Promise<void> {
  if (!(await exists(OUT_ROOT))) {
    fail(`missing export directory: ${OUT_ROOT}`);
    return;
  }

  for (const required of ['index.html', 'sitemap.xml', 'robots.txt']) {
    if (!(await exists(path.join(OUT_ROOT, required)))) fail(`missing ${required}.`);
  }

  const searchIndexPath = path.join(OUT_ROOT, 'api', 'search');
  if (!(await exists(searchIndexPath))) {
    fail('missing static search index (out/api/search).');
  } else if ((await fileSize(searchIndexPath)) === 0) {
    fail('static search index is empty (out/api/search).');
  }

  let missingMermaidAssets = 0;
  for (const fileName of new Set(Object.values(MERMAID_ASSET_PATHS))) {
    if (!(await exists(path.join(OUT_ROOT, 'mermaid', fileName)))) missingMermaidAssets += 1;
  }
  if (missingMermaidAssets > 0) {
    fail(`${missingMermaidAssets} Mermaid manifest assets missing from out/mermaid.`);
  }

  const htmlPages = await countHtmlFiles(OUT_ROOT);
  if (htmlPages < MIN_HTML_PAGES) {
    fail(`only ${htmlPages} HTML pages exported (expected at least ${MIN_HTML_PAGES}).`);
  }

  if (failures.length > 0) {
    for (const message of failures) console.error(`Build output check failed: ${message}`);
    process.exitCode = 1;
    return;
  }

  // Environment flags: EdgeOne log review will reveal whether CI is set there,
  // which decides if memory-related build limits can be gated by environment.
  // 环境标志：通过 EdgeOne 构建日志确认 CI 是否存在，用于决定构建内存
  // 限制将来是否可按环境门控。
  const edgeoneVars = Object.keys(process.env)
    .filter((key) => /edgeone/i.test(key))
    .join(',');
  console.info(
    `Build output verified: ${htmlPages} html pages, search index ${await formatMegabytes(searchIndexPath)}, ` +
      `${Object.keys(MERMAID_ASSET_PATHS).length} mermaid assets ok. (env: CI=${process.env.CI ?? 'unset'}, edgeone=${edgeoneVars || 'none'})`,
  );
}

await main();
