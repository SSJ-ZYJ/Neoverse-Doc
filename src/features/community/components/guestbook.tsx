// Giscus-backed guestbook. Locale comes from the active [lang] route segment;
// add a Locale → Giscus lang code mapping when introducing a new language pack.
// 基于 Giscus 的留言墙。语言取自当前 [lang] 路由段；
// 新增语言包时记得同步扩展 Locale → Giscus lang 代码映射。
// Uses `slugKey` as the discussion term so that Chinese and English pages share the same discussion thread.
// 使用 `slugKey` 作为讨论标识，使中英文页面共享同一个讨论串。

'use client';

import Giscus from '@giscus/react';
import { useParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { i18n, type Locale, resolveLocale } from '@/lib/i18n';
import { GISCUS_CONFIG, GISCUS_THEME_PATHS, GISCUS_THEME_URLS } from '@/lib/site-config';

const GISCUS_LANG_MAP: Record<Locale, string> = {
  zh: 'zh-CN',
  en: 'en',
};

interface GuestbookProps {
  slugKey: string;
}

export function Guestbook({ slugKey }: GuestbookProps) {
  const { resolvedTheme } = useTheme();
  const params = useParams<{ lang?: string }>();
  const [siteOrigin, setSiteOrigin] = useState<string>();
  const [switching, setSwitching] = useState(false);
  const prevThemeUrl = useRef<string | undefined>(undefined);
  const locale = resolveLocale(params?.lang);
  // Fallback references i18n.defaultLanguage to stay consistent if the default ever changes.
  // 回退引用 i18n.defaultLanguage，确保默认语言变更时保持一致。
  const giscusLang = GISCUS_LANG_MAP[locale] ?? GISCUS_LANG_MAP[i18n.defaultLanguage];
  const themeVariant = resolvedTheme === 'dark' ? 'dark' : 'light';
  const themeUrl =
    process.env.NODE_ENV === 'production'
      ? GISCUS_THEME_URLS[themeVariant]
      : siteOrigin
        ? new URL(GISCUS_THEME_PATHS[themeVariant], siteOrigin).toString()
        : undefined;

  // Giscus requires an absolute custom-theme URL because its content is rendered
  // in a cross-origin iframe; defer mounting until the browser origin is known.
  // Giscus 在跨域 iframe 中渲染，故自定义主题必须使用绝对 URL；
  // 等浏览器来源可用后再挂载，避免服务端与客户端主题不一致。
  useEffect(() => {
    setSiteOrigin(window.location.origin);
  }, []);

  // Theme-switch fade for giscus iframe. The cross-origin iframe swaps its
  // theme stylesheet when the `theme` prop changes, briefly showing unstyled
  // colors (visible on the comment input box) before the new CSS loads.
  //
  // Using `useLayoutEffect` (not `useEffect`) is critical: it runs **before
  // paint** after React commits the DOM. When `themeUrl` changes, React
  // commits the new `theme` attribute on `<giscus-widget>`, which triggers
  // the widget's `attributeChangedCallback` → `sendMessage` (postMessage) —
  // all synchronous during commit. `useLayoutEffect` fires right after commit
  // but still before paint, so `opacity:0` is applied to the iframe before
  // the browser has a chance to paint the unstyled state. `useEffect` would
  // run post-paint and miss the flash entirely.
  //
  // The fade-out duration is a fixed 400ms rather than waiting for giscus's
  // `resizeHeight` message: that message only fires when the iframe height
  // changes, but theme swaps often keep the same height, so the signal is
  // unreliable and caused the iframe to stay hidden until the 1.5s fallback.
  //
  // 主题切换时渐隐 giscus iframe。`theme` prop 变化时，跨域 iframe 会
  // 切换主题样式表，在新 CSS 加载完成前短暂显示未样式化的颜色
  // （在评论输入框上尤为可见）。
  //
  // 使用 `useLayoutEffect`（而非 `useEffect`）是关键：它在 React commit
  // DOM 后、**paint 前**同步执行。`themeUrl` 变化时 React 先 commit
  // `<giscus-widget>` 的新 `theme` attribute，触发其
  // `attributeChangedCallback` → `sendMessage`（postMessage，commit 期间
  // 同步发出）。`useLayoutEffect` 在 commit 后、paint 前立即执行，使
  // `opacity:0` 在浏览器 paint 未样式化状态前就已生效。`useEffect`
  // 在 paint 后执行，会完全错过这个时机。
  //
  // 渐隐时长固定为 400ms，不等待 giscus 的 `resizeHeight` 消息：该消息
  // 仅在 iframe 高度变化时回发，而主题切换往往不改变高度，因此信号
  // 不可靠，会导致 iframe 一直隐藏到 1.5s 兜底才恢复（"出现很晚"）。
  useLayoutEffect(() => {
    const prev = prevThemeUrl.current;
    prevThemeUrl.current = themeUrl;
    // Only fade when swapping between two valid theme URLs (not on initial mount).
    // 仅在两个有效主题 URL 之间切换时触发渐隐（初始挂载不触发）。
    if (!prev || !themeUrl || prev === themeUrl) return;

    setSwitching(true);
    const timer = setTimeout(() => setSwitching(false), 400);
    return () => clearTimeout(timer);
  }, [themeUrl]);

  return (
    <div
      className="giscus-shell"
      data-loading={themeUrl ? undefined : ''}
      data-switching={switching || undefined}
    >
      {themeUrl ? (
        <Giscus
          repo={GISCUS_CONFIG.repo}
          repoId={GISCUS_CONFIG.repoId}
          category={GISCUS_CONFIG.category}
          categoryId={GISCUS_CONFIG.categoryId}
          mapping="specific"
          term={slugKey}
          reactionsEnabled="1"
          emitMetadata="0"
          inputPosition="top"
          theme={themeUrl}
          lang={giscusLang}
          loading="lazy"
        />
      ) : (
        <div className="giscus-shell__placeholder" aria-hidden="true" />
      )}
    </div>
  );
}
