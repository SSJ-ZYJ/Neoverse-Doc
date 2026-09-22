import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import puppeteer from 'puppeteer';

// Functional regression only: no screenshots or visual baselines.
// 仅检查功能契约，不生成截图或视觉基线。
const root = resolve(import.meta.dirname, '..');
const outDir = resolve(root, 'out');
const cacheDir = resolve(root, 'node_modules/.cache');
await mkdir(cacheDir, { recursive: true });
const fixtureDir = await mkdtemp(resolve(cacheDir, 'reading-'));
let server;
let browser;
try {
  await writeFile(
    resolve(fixtureDir, 'fixture.tsx'),
    `
import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import { UiButton } from '@neoverse-ui/react';
import { CustomCodeBlock, LongCodeBlock } from '@/components/mdx/custom-codeblock';
import { DocsTable } from '@/components/mdx/docs-table';
function Fixture() {
  const ref = useRef<HTMLButtonElement>(null);
  const [count, setCount] = useState(0);
  const [submitted, setSubmitted] = useState(0);
  useEffect(() => { document.body.dataset.ref = ref.current?.tagName; }, []);
  return <main id="nd-page" style={{width:"100%", maxWidth:"100%", minWidth:0}}><div data-docs-body style={{width:"100%", minWidth:0}}>
    <form onSubmit={event => { event.preventDefault(); setSubmitted(v => v + 1); }}>
      <UiButton id="normal" name="copy" ref={ref} onClick={() => setCount(v => v + 1)}>Copy</UiButton>
      <UiButton id="disabled" disabled onClick={() => setCount(v => v + 1)}>Disabled</UiButton>
      <UiButton id="loading" loading onClick={() => setCount(v => v + 1)}>Loading</UiButton>
      <UiButton id="submit" type="submit">Submit</UiButton>
      <output id="counts">{count}:{submitted}</output>
    </form>
    <CustomCodeBlock><code>{'// src/example.ts\\nconst value = 1;\\n\\nexport { value };'}</code></CustomCodeBlock>
    <LongCodeBlock code={'x'.repeat(1000) + '\\n\\nlast line'} lang="text" title="long.txt" />
    <DocsTable><caption>Wide table</caption><tbody><tr><td>{'wide_column_'.repeat(60)}</td></tr></tbody></DocsTable>
  </div></main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);
`,
  );
  const built = await Bun.build({
    entrypoints: [resolve(fixtureDir, 'fixture.tsx')],
    target: 'browser',
  });
  assert.equal(built.success, true, built.logs.map(String).join('\n'));
  const bundle = await built.outputs[0].text();
  const articlePath = '/zh/docs/about/contributing/syntax-example';
  const html = await readFile(resolve(outDir, `${articlePath.slice(1)}.html`), 'utf8');
  const cssLinks = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)]
    .map((match) => match[0])
    .join('');
  assert.ok(cssLinks, 'production CSS links must be present');
  server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const path = decodeURIComponent(new URL(request.url).pathname);
      if (path === '/fixture.js')
        return new Response(bundle, { headers: { 'Content-Type': 'text/javascript' } });
      if (path === '/fixture')
        return new Response(
          `<!doctype html><html><head>${cssLinks}</head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>`,
          { headers: { 'Content-Type': 'text/html' } },
        );
      if (path.split('/').includes('..')) return new Response('Bad path', { status: 400 });
      for (const candidate of [path, `${path}.html`]) {
        const file = Bun.file(resolve(outDir, candidate.replace(/^\/+/, '')));
        if (await file.exists()) return new Response(file);
      }
      return new Response('Not found', { status: 404 });
    },
  });
  const origin = `http://127.0.0.1:${server.port}`;
  browser = await puppeteer.launch({
    headless: true,
    ...(process.env.READING_BROWSER ? { executablePath: process.env.READING_BROWSER } : {}),
  });
  const page = await browser.newPage();
  // Isolate clipboard IO while testing actual button events and copied text.
  // 隔离剪贴板 IO，同时测试真实按钮事件与复制文本。
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'clipboard', { value: {
      writeText: async text => { window.__readingClipboard = text; },
    } });
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/fixture`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.dataset.ref === 'BUTTON');
  await page.click('#normal');
  assert.equal(await page.$eval('#counts', (node) => node.textContent), '1:0');
  await page.evaluate(() => {
    document.querySelector('#disabled').click();
    document.querySelector('#loading').click();
  });
  assert.equal(await page.$eval('#counts', (node) => node.textContent), '1:0');
  assert.equal(await page.$eval('#loading', (node) => node.getAttribute('aria-busy')), 'true');
  await page.click('#submit');
  assert.equal(await page.$eval('#counts', (node) => node.textContent), '1:1');
  assert.equal(await page.$eval('figcaption', (node) => node.textContent), 'src/example.ts');
  await page.click('.glass-codeblock .docs-code-copy');
  await page.waitForSelector('.docs-code-copy[data-checked]');
  assert.equal(
    await page.evaluate(() => window.__readingClipboard),
    'const value = 1;\n\nexport { value };',
  );
  assert.equal(
    await page.$eval('.docs-long-codeblock pre', (node) => node.textContent),
    `${'x'.repeat(1000)}\n\nlast line`,
  );

  for (const theme of ['light', 'dark']) {
    await page.setViewport({ width: 390, height: 844 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.evaluate((value) => {
      document.documentElement.className = value;
    }, theme);
    const metrics = await page.evaluate(() => {
      const table = document.querySelector('.docs-table-scroll');
      const code = document.querySelector('.docs-long-codeblock .docs-codeblock__scroll');
      return {
        tableMetrics: { scroll: table.scrollWidth, width: table.clientWidth, overflow: getComputedStyle(table).overflowX, cellWrap: getComputedStyle(table.querySelector("td")).overflowWrap, cellBreak: getComputedStyle(table.querySelector("td")).wordBreak },
        tableScrollable:
          table.scrollWidth > table.clientWidth && getComputedStyle(table).overflowX === 'auto',
        codeScrollable:
          code.scrollWidth > code.clientWidth && getComputedStyle(code).overflowX === 'auto',
        bodyFits: document.documentElement.scrollWidth <= window.innerWidth,
        spinner: getComputedStyle(document.querySelector('.ui-button-control__spinner'))
          .animationName,
        blur: getComputedStyle(document.querySelector('.glass-codeblock')).backdropFilter,
      };
    });
    assert.equal(metrics.tableScrollable, true, `${theme}: table scroll boundary ${JSON.stringify(metrics)}`);
    assert.equal(metrics.codeScrollable, true, `${theme}: code scroll boundary`);
    assert.equal(metrics.bodyFits, true, `${theme}: article must not widen viewport`);
    await page.focus('.docs-table-scroll');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('.docs-table-scroll').scrollLeft > 0);
    assert.equal(metrics.spinner, 'none');
    assert.equal(metrics.blur, 'none');
  }

  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${origin}${articlePath}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() =>
    document.querySelector('.docs-code-tabs')?.style.getPropertyValue('--tab-indicator-w'),
  );
  const tab = await page.$('.docs-code-tabs [role="tab"]');
  await tab.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() =>
    document
      .querySelector('.docs-code-tabs [role="tab"][aria-selected="true"]')
      ?.textContent?.includes('Python'),
  );
  const nested = await page.$eval('.docs-code-tabs [role="tabpanel"] .glass-codeblock', (node) => ({
    border: getComputedStyle(node).borderTopWidth,
    shadow: getComputedStyle(node).boxShadow,
    blur: getComputedStyle(node).backdropFilter,
  }));
  assert.deepEqual(nested, { border: '0px', shadow: 'none', blur: 'none' });
  const details = await page.$('details.markdown-details:not(.markdown-details-ai)');
  assert.ok(details);
  const before = await details.evaluate((node) => node.open);
  const summary = await details.$('summary');
  await summary.click();
  assert.equal(await details.evaluate((node) => node.open), !before);
  const cards = await page.$$eval('a.mdx-doc-card', (nodes) =>
    nodes.map((node) => ({ href: node.getAttribute('href'), tag: node.tagName })),
  );
  assert.ok(cards.some((card) => card.href === '/zh/docs/ch0' && card.tag === 'A'));
  // Static HTML must carry the article content before hydration.
  // 正文内容必须在注水前已经包含于静态 HTML。
  assert.ok(html.includes('docs-table-scroll') && html.includes('docs-codeblock__header'));
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'production article fits narrow viewport');
  assert.deepEqual(errors, []);
  console.log(
    'Reading regression passed: native button ref/events/loading/form, code title/copy/blank lines/long code, mobile scroll in both themes, reduced motion, Tabs keyboard, disclosure, and navigation semantics.',
  );
} finally {
  await browser?.close();
  server?.stop(true);
  assert.ok(fixtureDir.startsWith(`${cacheDir}${sep}`));
  await rm(fixtureDir, { recursive: true, force: true });
}
