// Headless renderer for mermaid assets. Loaded only by the generate stage of
// scripts/content-pipeline.ts via dynamic import — the verify stage and every
// production build must never pull puppeteer into memory.
// Mermaid 资产的无头渲染器。仅被 scripts/content-pipeline.ts 的 generate
// 阶段动态加载 —— verify 阶段与所有生产构建绝不能把 puppeteer 载入内存。
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import { MERMAID_CONFIG } from '../src/features/mermaid';
import { type MermaidChart, PROJECT_ROOT } from './mermaid-assets';

const MERMAID_STYLE_PATH = path.join(PROJECT_ROOT, 'src', 'features', 'mermaid', 'styles.css');
const MERMAID_BROWSER_BUNDLE = path.join(
  PROJECT_ROOT,
  'node_modules',
  'mermaid',
  'dist',
  'mermaid.min.js',
);

interface BrowserMermaidApi {
  initialize: (config: unknown) => void;
  render: (id: string, source: string, container?: HTMLElement) => Promise<{ svg: string }>;
}

async function createRendererPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  const mermaidStyle = await readFile(MERMAID_STYLE_PATH, 'utf8');
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html>
    <html>
      <head>
        <style>
          html, body {
            margin: 0;
            font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Noto Sans", sans-serif;
          }

          #mermaid-build-host {
            position: fixed;
            left: -100000px;
            top: 0;
            visibility: hidden;
          }
        </style>
      </head>
      <body><div id="mermaid-build-host" class="mermaid-svg-host"></div></body>
    </html>`);
  await page.addStyleTag({ content: mermaidStyle });
  await page.addScriptTag({ path: MERMAID_BROWSER_BUNDLE });
  await page.evaluate(async (config) => {
    const runtime = (globalThis as typeof globalThis & { mermaid?: BrowserMermaidApi }).mermaid;
    if (!runtime) throw new Error('Project Mermaid browser bundle did not initialize.');
    await document.fonts.ready;
    runtime.initialize(config);
  }, MERMAID_CONFIG);
  return page;
}

async function renderWithProjectMermaid(
  page: Page,
  sourceId: string,
  source: string,
): Promise<string> {
  return page.evaluate(
    async ({ id, definition }) => {
      const runtime = (globalThis as typeof globalThis & { mermaid?: BrowserMermaidApi }).mermaid;
      if (!runtime) throw new Error('Project Mermaid browser bundle is unavailable.');

      const renderId = `mermaid-${id}`;
      const host = document.getElementById('mermaid-build-host');
      if (!(host instanceof HTMLElement)) throw new Error('Mermaid build host is unavailable.');
      host.replaceChildren();
      try {
        const { svg } = await runtime.render(renderId, definition, host);
        return svg;
      } finally {
        document.getElementById(`d${renderId}`)?.remove();
      }
    },
    { id: sourceId, definition: source },
  );
}

// Renders the pending charts in one browser session and returns SVG by
// source ID; the caller owns naming and file writes.
// 在同一浏览器会话中渲染待生成图表，按源码 ID 返回 SVG；命名与写盘由调用方负责。
export async function renderMermaidBatch(
  charts: ReadonlyArray<MermaidChart>,
): Promise<Map<string, string>> {
  const browser = await puppeteer.launch();
  try {
    const page = await createRendererPage(browser);
    const rendered = new Map<string, string>();
    for (const chart of charts) {
      rendered.set(
        chart.sourceId,
        await renderWithProjectMermaid(page, chart.sourceId, chart.source),
      );
    }
    return rendered;
  } finally {
    await browser.close();
  }
}
