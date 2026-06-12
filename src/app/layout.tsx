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
import { ThemeProvider } from 'next-themes';
import { i18n } from '@/lib/i18n';
import '@/app/globals.css';

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
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
