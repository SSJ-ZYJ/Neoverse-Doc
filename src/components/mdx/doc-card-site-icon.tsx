'use client';

// Resolves a site's declared SVG logo or favicon without delaying card rendering.
// The existing vector icon remains visible while loading and after any failure.
// 在不阻塞卡片渲染的前提下解析目标站点声明的 SVG logo 或 favicon；
// 加载期间或失败后继续显示现有矢量图标，避免出现破图与布局偏移。

import { Globe } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface DocCardSiteIconProps {
  href: string;
}

type IconStatus = 'loading' | 'loaded' | 'failed';

export function DocCardSiteIcon({ href }: DocCardSiteIconProps) {
  const [status, setStatus] = useState<IconStatus>('loading');
  const imageRef = useRef<HTMLImageElement>(null);
  const iconHref = getSiteIconHref(href);
  const canLoadIcon = iconHref !== null && status !== 'failed';

  // A cached favicon may finish before React attaches onLoad. Reconcile the
  // native image state after mount so the fallback never disappears into an
  // empty icon canvas after refresh or back/forward navigation.
  // 缓存 favicon 可能在 React 绑定 onLoad 前完成；挂载后同步原生图片状态，
  // 避免刷新或前进后退时默认图标消失并留下空白画布。
  useEffect(() => {
    const image = imageRef.current;
    if (!image?.complete) return;

    setStatus(image.naturalWidth > 0 ? 'loaded' : 'failed');
  }, []);

  return (
    <span className="mdx-doc-card__site-icon" data-loaded={status === 'loaded'}>
      <Globe className="mdx-doc-card__site-icon-fallback" size={18} strokeWidth={1.8} />
      <span
        className="mdx-doc-card__site-icon-brand"
        style={
          status === 'loaded' && iconHref ? { backgroundImage: `url("${iconHref}")` } : undefined
        }
      />
      {canLoadIcon && (
        // The image is only a lazy loading probe; the visible mark uses a
        // dedicated background layer to avoid MDX prose image-style conflicts.
        // 图片仅作为懒加载探针；可见图标由独立背景层绘制，避免与 MDX 正文图片样式冲突。
        // biome-ignore lint/performance/noImgElement: arbitrary external SVG hosts cannot be declared in static Next Image configuration / 任意外部 SVG 主机无法预先写入静态 Next Image 配置
        <img
          alt=""
          className="mdx-doc-card__site-icon-loader"
          decoding="async"
          fetchPriority="low"
          height={20}
          loading="lazy"
          onError={() => setStatus('failed')}
          onLoad={() => setStatus('loaded')}
          ref={imageRef}
          referrerPolicy="no-referrer"
          src={iconHref}
          width={20}
        />
      )}
    </span>
  );
}

function getSiteIconHref(href: string) {
  try {
    const url = new URL(href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    // The resolver follows the site's declared icon metadata, prioritizes SVG,
    // and proxies the official favicon when no vector asset is published.
    // 解析服务遵循站点声明的图标元数据，优先 SVG；未发布矢量资源时代理官网 favicon。
    return `https://geticon.dev/?url=${encodeURIComponent(url.hostname)}`;
  } catch {
    return null;
  }
}
