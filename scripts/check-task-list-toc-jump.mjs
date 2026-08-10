import { resolve } from 'node:path';
import puppeteer from 'puppeteer';

const outDir = resolve(import.meta.dirname, '..', 'out');
const articlePath = '/zh/docs/ch1/1.14-Environment-Setup';
const cpuThrottle = Number(process.env.CPU_THROTTLE ?? 6);
const reducedMotion = process.env.REDUCED_MOTION === '1';

// Serve exported `.html` files through their production clean URLs.
// 通过生产环境使用的无扩展名 URL 提供静态导出的 `.html` 文件。
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const pathname = decodeURIComponent(new URL(request.url).pathname);
    const relativePath = pathname.replace(/^\/+/, '');
    if (relativePath.split('/').includes('..')) {
      return new Response('Bad request', { status: 400 });
    }

    const candidates = [relativePath, `${relativePath}.html`];
    for (const candidate of candidates) {
      const file = Bun.file(resolve(outDir, candidate));
      if (await file.exists()) {
        return new Response(file, { headers: { 'Cache-Control': 'no-store' } });
      }
    }

    return new Response('Not found', { status: 404 });
  },
});

const browser = await puppeteer.launch({ headless: true });

try {
  const page = await browser.newPage();
  // A busy main thread makes skipped TOC observer updates deterministic.
  // 主线程繁忙时可稳定复现 TOC 观察更新被跳过的问题。
  if (cpuThrottle > 1) await page.emulateCPUThrottling(cpuThrottle);
  if (reducedMotion) {
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  }
  await page.setViewport({ width: 1920, height: 1256, deviceScaleFactor: 1 });
  await page.goto(`http://${server.hostname}:${server.port}${articlePath}`, {
    waitUntil: 'networkidle0',
  });
  await page.waitForSelector('.mdx-task-progress__jump');
  await page.waitForFunction(
    () =>
      document.querySelectorAll('div[class*="[grid-area:toc]"] a[data-active="true"]').length > 0,
  );

  await page.evaluate(() => {
    window.__taskListJumpScrollEvents = 0;
    window.__taskListJumpFirstScrollAt = 0;
    window.__taskListJumpLastScrollAt = 0;
    window.addEventListener(
      'scroll',
      () => {
        window.__taskListJumpScrollEvents += 1;
        const now = performance.now();
        if (window.__taskListJumpFirstScrollAt === 0) window.__taskListJumpFirstScrollAt = now;
        window.__taskListJumpLastScrollAt = now;
      },
      { passive: true },
    );
  });
  await page.click('.mdx-task-progress__jump');
  await page.waitForFunction(() => location.hash.includes('todo'));

  let stableSamples = 0;
  let previousScrollY = -1;
  let maxClipSpan = 0;
  for (let attempt = 0; attempt < 50 && stableSamples < 5; attempt += 1) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    const sample = await page.evaluate(() => {
      const tracker = document.querySelector(
        'div[class*="[grid-area:toc]"] svg[class*="transition-[clip-path]"]',
      );
      const clipPath = tracker ? getComputedStyle(tracker).clipPath : '';
      const match = clipPath.match(/^polygon\(0px ([\d.]+)px, 100% [\d.]+px, 100% ([\d.]+)px/);
      return {
        clipSpan: match ? Number(match[2]) - Number(match[1]) : 0,
        scrollY,
      };
    });
    maxClipSpan = Math.max(maxClipSpan, sample.clipSpan);
    stableSamples = sample.scrollY === previousScrollY ? stableSamples + 1 : 0;
    previousScrollY = sample.scrollY;
  }
  await new Promise((resolveWait) => setTimeout(resolveWait, 500));

  const result = await page.evaluate(() => {
    const toc = [...document.querySelectorAll('div')].find((element) => {
      const rect = element.getBoundingClientRect();
      return element.className.includes('[grid-area:toc]') && rect.width > 0;
    });
    if (!toc) throw new Error('Desktop TOC was not rendered.');

    const links = [...toc.querySelectorAll('a[href^="#"]')];
    const targetIndex = links.findIndex((link) => link.getAttribute('href')?.includes('todo'));
    const active = links
      .map((link, index) => ({
        index,
        text: link.textContent?.trim() ?? '',
        active: link.dataset.active === 'true',
      }))
      .filter((item) => item.active);
    const tracker = toc.querySelector('svg[class*="transition-[clip-path]"]');
    const clipPath = tracker ? getComputedStyle(tracker).clipPath : '';
    const match = clipPath.match(/^polygon\(0px ([\d.]+)px, 100% [\d.]+px, 100% ([\d.]+)px/);

    return {
      active,
      clipPath,
      clipSpan: match ? Number(match[2]) - Number(match[1]) : Number.POSITIVE_INFINITY,
      hash: location.hash,
      scrollEventCount: window.__taskListJumpScrollEvents ?? 0,
      scrollDurationMs:
        (window.__taskListJumpLastScrollAt ?? 0) - (window.__taskListJumpFirstScrollAt ?? 0),
      scrollY,
      staleActive: active.filter((item) => item.index < targetIndex - 1),
      targetActive: active.some((item) => item.index === targetIndex),
    };
  });
  result.maxClipSpan = maxClipSpan;
  result.reducedMotion = reducedMotion;

  const motionIsValid = reducedMotion ? result.scrollEventCount <= 2 : result.scrollEventCount >= 5;

  console.log(JSON.stringify(result, null, 2));
  if (
    !result.targetActive ||
    result.staleActive.length > 0 ||
    result.clipSpan > 120 ||
    result.maxClipSpan > 120 ||
    !motionIsValid
  ) {
    throw new Error('Task-list jump lost smooth motion or left an invalid TOC active track.');
  }
} finally {
  await browser.close();
  server.stop(true);
}
