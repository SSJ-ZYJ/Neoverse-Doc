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

const GISCUS_THEME_READY_TIMEOUT_MS = 5000;

interface GuestbookProps {
  slugKey: string;
}

export function Guestbook({ slugKey }: GuestbookProps) {
  const { resolvedTheme } = useTheme();
  const params = useParams<{ lang?: string }>();
  const shellRef = useRef<HTMLDivElement>(null);
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

  // Hide the old iframe before replacing it, then reveal the new iframe after
  // its own load state clears. Giscus only exposes theme updates through a
  // postMessage with no completion event, so remounting with the theme URL as
  // the key gives the transition a real browser-level readiness signal.
  // 在替换 iframe 前先隐藏旧内容，并在新 iframe 完成加载后再显示。Giscus 的
  // 主题更新只有 postMessage，没有完成事件；用主题 URL 作为 key 重挂载，
  // 才能获得浏览器层面的真实就绪信号。
  useLayoutEffect(() => {
    const prev = prevThemeUrl.current;
    prevThemeUrl.current = themeUrl;
    // Only fade when swapping between two valid theme URLs (not on initial mount).
    // 仅在两个有效主题 URL 之间切换时触发渐隐（初始挂载不触发）。
    if (!prev || !themeUrl || prev === themeUrl) return;

    setSwitching(true);
  }, [themeUrl]);

  useLayoutEffect(() => {
    if (!themeUrl || !switching) return;

    const shell = shellRef.current;
    if (!shell) return;

    let settled = false;
    let timeout: number | undefined;
    let shellObserver: MutationObserver | undefined;
    let shadowObserver: MutationObserver | undefined;
    let iframeObserver: MutationObserver | undefined;
    let watchedIframe: HTMLIFrameElement | undefined;
    let animationFrame: number | undefined;

    const cleanup = () => {
      shellObserver?.disconnect();
      shadowObserver?.disconnect();
      iframeObserver?.disconnect();
      if (watchedIframe) watchedIframe.removeEventListener('load', handleIframeLoad);
      if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
      if (timeout !== undefined) window.clearTimeout(timeout);
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      setSwitching(false);
    };

    const handleIframeLoad = () => {
      // Let the component's own load handler remove its `loading` class first.
      // 让组件自己的 load 处理器先移除 `loading` class。
      animationFrame = window.requestAnimationFrame(() => {
        const iframe = watchedIframe;
        if (iframe && !iframe.classList.contains('loading')) finish();
      });
    };

    const watchWidget = () => {
      const widget = shell.querySelector('giscus-widget');
      const shadowRoot = widget?.shadowRoot;
      if (!shadowRoot) return;

      if (!shadowObserver) {
        shadowObserver = new MutationObserver(watchWidget);
        shadowObserver.observe(shadowRoot, { childList: true, subtree: true });
      }

      const iframe = shadowRoot.querySelector('iframe');
      if (!iframe || iframe === watchedIframe) {
        if (iframe && !iframe.classList.contains('loading')) finish();
        return;
      }

      watchedIframe?.removeEventListener('load', handleIframeLoad);
      iframeObserver?.disconnect();
      watchedIframe = iframe;
      iframe.addEventListener('load', handleIframeLoad);
      iframeObserver = new MutationObserver(() => {
        if (!iframe.classList.contains('loading')) finish();
      });
      iframeObserver.observe(iframe, { attributes: true, attributeFilter: ['class'] });
      if (!iframe.classList.contains('loading')) finish();
    };

    shellObserver = new MutationObserver(watchWidget);
    shellObserver.observe(shell, { childList: true, subtree: true });
    watchWidget();

    // External comments should never remain permanently hidden if the network
    // cannot complete the iframe load; the fallback is only a safety valve.
    // 外部评论网络异常时不能永久隐藏内容；此定时器仅作为安全兜底。
    timeout = window.setTimeout(finish, GISCUS_THEME_READY_TIMEOUT_MS);

    return cleanup;
  }, [switching, themeUrl]);

  return (
    <div
      ref={shellRef}
      className="giscus-shell"
      data-loading={themeUrl ? undefined : ''}
      data-switching={switching || undefined}
    >
      {themeUrl ? (
        <Giscus
          key={themeUrl}
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
