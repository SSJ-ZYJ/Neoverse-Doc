// Route-loading handoff helpers keep the root loading screen visible until
// the locale homepage has painted, then release it with a CSS animation.
// 路由加载交接工具：根加载页保持可见直到多语言首页完成绘制，再通过 CSS 动画释放。

import { MOTION_DURATION_MS } from '@/lib/motion-config';

const ROUTE_LOADING_HANDOFF_ID = 'nd-route-loading-handoff';
const ROUTE_LOADING_SOURCE_SELECTOR = '.route-loading-shell';
const ROUTE_LOADING_HANDOFF_CLASS = 'route-loading-shell--handoff';
const ROUTE_LOADING_RELEASE_CLASS = 'route-loading-shell--release';

export function mountRouteLoadingHandoff(): void {
  if (typeof document === 'undefined') return;

  document.getElementById(ROUTE_LOADING_HANDOFF_ID)?.remove();

  const source = document.querySelector<HTMLElement>(ROUTE_LOADING_SOURCE_SELECTOR);
  if (!source) return;

  // Clone the visible loading route into <body> so it survives the App Router
  // tree swap between "/" and the locale homepage.
  // 将当前可见的加载路由克隆到 <body>，使其跨越 "/" 到多语言首页的路由树替换。
  const overlay = source.cloneNode(true) as HTMLElement;
  overlay.id = ROUTE_LOADING_HANDOFF_ID;
  overlay.setAttribute('aria-hidden', 'true');
  overlay.removeAttribute('aria-live');
  overlay.classList.add(ROUTE_LOADING_HANDOFF_CLASS);

  document.body.appendChild(overlay);
}

export function releaseRouteLoadingHandoff(): void {
  if (typeof document === 'undefined') return;

  const overlay = document.getElementById(ROUTE_LOADING_HANDOFF_ID);
  if (!overlay || overlay.classList.contains(ROUTE_LOADING_RELEASE_CLASS)) return;

  const removeOverlay = () => overlay.remove();

  // Start on the next frame so the destination homepage can sit behind the
  // overlay before it fades, avoiding a single-frame background flash.
  // 下一帧再启动释放动画，确保目标首页已经位于覆盖层后方，避免单帧背景闪烁。
  window.requestAnimationFrame(() => {
    overlay.addEventListener('animationend', removeOverlay, { once: true });
    overlay.classList.add(ROUTE_LOADING_RELEASE_CLASS);
    window.setTimeout(removeOverlay, MOTION_DURATION_MS.loadingRelease + 400);
  });
}
