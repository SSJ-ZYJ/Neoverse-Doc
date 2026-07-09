// Root layout: hosts <html>/<body>, global fonts, and the theme provider.
// next-themes ThemeProvider is placed here so it does NOT re-mount when
// switching [lang] segments, avoiding React 19 script warnings caused by
// client-side double-rendering of the theme script. Fumadocs' RootProvider
// also bundles a next-themes ThemeProvider by default — we disable it via
// `theme={{ enabled: false }}` in src/app/[lang]/layout.tsx so we don't end
// up nesting two providers (which is what was previously triggering the
// "script tag while rendering React component" warning).
// Real i18n translation injection is handled by src/app/[lang]/layout.tsx.
// Font strategy:
//   - Orbitron: Logo only (via --font-orbitron CSS variable)
//   - Noto Sans SC: Default body font
//   - Maple Mono NF CN: Code block font (local font)
// 根布局：承载 <html>/<body>、全局字体和主题提供器。
// next-themes 的 ThemeProvider 放在这里，确保切换 [lang] 段时它不会重新挂载，
// 从而避免主题脚本被客户端二次渲染触发 React 19 的 script 警告。
// fumadocs 的 RootProvider 默认也会包一层 next-themes ThemeProvider，
// 我们在 src/app/[lang]/layout.tsx 中通过 `theme={{ enabled: false }}` 将其关闭，
// 避免出现两个 Provider 嵌套（这是此前触发
// "script tag while rendering React component" 警告的根因）。
// 真正的多语言翻译注入由 src/app/[lang]/layout.tsx 完成。
// 字体策略：
//   - Orbitron：仅用于 Logo（通过 --font-orbitron CSS 变量）
//   - Noto Sans SC：正文默认字体
//   - Maple Mono NF CN：代码块字体（本地字体）

import { Noto_Sans_SC, Orbitron } from 'next/font/google';
import Script from 'next/script';
import { ThemeProvider } from 'next-themes';
import GlassRippleController from '@/components/glass-ripple-controller';
import ImmersiveScrollbar from '@/components/immersive-scrollbar';
import { i18n } from '@/lib/i18n';
import '@/app/globals.css';
// Route loading styles are imported at the root CSS entry for Turbopack tracking.
// 路由加载样式在根 CSS 入口导入，确保 Turbopack 稳定追踪。
import '@/styles/loading.css';
// KaTeX styles render LaTeX formulas emitted by the MDX math pipeline.
// KaTeX 样式用于渲染 MDX 数学管线输出的 LaTeX 公式。
import 'katex/dist/katex.css';

// Native BFCache restore guard: runs before React hydration so external-site
// back navigation cannot resume stale, non-interactive client trees. It only
// reacts to persisted BFCache restores so normal App Router transitions (such
// as Home -> Docs) are never interrupted.
// 原生 BFCache 恢复守卫：在 React 水合前运行，避免从外部站点回退时恢复到
// 过期且不可交互的客户端树。它只响应持久化 BFCache 恢复，确保正常的
// App Router 切换（如首页 -> 文档）不会被打断。
const historyRestoreScript = `
(() => {
  const key = 'nd-history-restore-reload';

  function readReloadMarker() {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeReloadMarker(value) {
    try {
      sessionStorage.setItem(key, value);
    } catch {}
  }

  function clearReloadMarker() {
    try {
      sessionStorage.removeItem(key);
    } catch {}
  }

  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) {
      clearReloadMarker();
      return;
    }

    const marker = location.href;
    if (readReloadMarker() === marker) return;

    writeReloadMarker(marker);
    location.reload();
  });
})();
`;

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-orbitron',
});

const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={i18n.defaultLanguage} suppressHydrationWarning>
      <body className={`antialiased min-h-screen ${orbitron.variable} ${notoSansSC.variable}`}>
        {/* Native BFCache restore guard must not depend on React hydration.
            原生 BFCache 恢复守卫不能依赖 React 水合。 */}
        <Script id="nd-history-restore-guard" strategy="beforeInteractive">
          {historyRestoreScript}
        </Script>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Global glass ripple controller keeps particle feedback visible after pointer release.
              全局玻璃波纹控制器，让粒子反馈在指针释放后仍完整播放。 */}
          <GlassRippleController />
          {/* Custom viewport scrollbar removes the browser's default white gutter.
              自定义视口滚动条移除浏览器默认白色滚动槽。 */}
          <ImmersiveScrollbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
