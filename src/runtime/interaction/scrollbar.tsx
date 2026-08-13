// Immersive root scrollbar: replaces the browser viewport scrollbar with a glass thumb.
// 沉浸式根滚动条：用玻璃 thumb 替换浏览器视口原生滚动条。

'use client';

import { useEffect, useRef } from 'react';
import { getFumadocsTopChromeElements } from '@/adapters/fumadocs/dom';

interface ScrollbarMetrics {
  maxScroll: number;
  thumbHeight: number;
  trackHeight: number;
  visible: boolean;
}

interface DragState {
  offsetY: number;
  pointerId: number;
}

const ROOT_READY_CLASS = 'nd-immersive-scrollbar-ready';
// Active class hides the native root scrollbar only after custom metrics are valid.
// active 类仅在自定义滚动条尺寸有效后隐藏原生根滚动条。
const ROOT_ACTIVE_CLASS = 'nd-immersive-scrollbar-active';
const ROOT_DRAGGING_CLASS = 'nd-immersive-scrollbar-dragging';
const MIN_THUMB_HEIGHT = 44;
const DEFAULT_EDGE_INSET = 8;
const TOP_CHROME_GAP = 8;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function ImmersiveScrollbar() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const mountedTrackElement = trackRef.current;

    if (!mountedTrackElement) return;

    const trackElement: HTMLDivElement = mountedTrackElement;

    let layoutAnimationFrame = 0;
    let scrollAnimationFrame = 0;
    let metrics: ScrollbarMetrics = {
      maxScroll: 0,
      thumbHeight: 0,
      trackHeight: 0,
      visible: false,
    };
    let dragState: DragState | null = null;
    // Paused while the tab is hidden so background pages do not keep firing
    // ResizeObserver / scroll / resize callbacks for a scrollbar no one sees.
    // 标签页隐藏时暂停，避免后台页面持续触发 ResizeObserver / scroll / resize
    // 回调来更新一个无人可见的滚动条。
    let paused = false;

    // Mark the viewport as handled only after the custom scrollbar has mounted.
    // 仅在自定义滚动条挂载后标记视口已接管，避免无 JS 时丢失原生滚动条。
    root.classList.add(ROOT_READY_CLASS);

    function isVisibleTopChrome(element: HTMLElement) {
      const rect = element.getBoundingClientRect();
      const trackRect = trackElement.getBoundingClientRect();
      const style = window.getComputedStyle(element);

      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        rect.width <= 0 ||
        rect.height <= 0 ||
        // Only top chrome that overlaps the right-side scrollbar lane needs avoidance.
        // 只有覆盖右侧滚动条通道的顶部控件才需要避让。
        rect.right <= trackRect.left ||
        rect.left >= trackRect.right ||
        rect.bottom <= 0 ||
        rect.top >= window.innerHeight
      ) {
        return false;
      }

      return (
        style.position === 'fixed' || style.position === 'sticky' || rect.top <= TOP_CHROME_GAP
      );
    }

    // Cache of top chrome elements to avoid re-running querySelectorAll on every
    // scroll frame. Invalidated by a MutationObserver when the DOM changes
    // (route navigation, sidebar toggle, etc.). Stale entries (disconnected
    // nodes) are filtered out lazily on the next update.
    // 顶部控件元素缓存，避免每次滚动帧都重新执行 querySelectorAll。
    // 由 MutationObserver 在 DOM 变化时（路由导航、侧栏切换等）失效。
    // 过期条目（已断开连接的节点）在下一次更新时惰性过滤。
    let topChromeElements: HTMLElement[] = [];
    let topChromeCacheDirty = true;

    function refreshTopChromeCache() {
      topChromeElements = getFumadocsTopChromeElements().filter((el) => el.isConnected);
      topChromeCacheDirty = false;
    }

    function updateChromeOffset() {
      if (topChromeCacheDirty) {
        refreshTopChromeCache();
      }

      let topChromeBottom = 0;

      for (const element of topChromeElements) {
        // Lazily detect disconnected nodes (e.g. after a route change that
        // the MutationObserver hasn't fired for yet) and mark the cache dirty.
        // 惰性检测已断开连接的节点（如 MutationObserver 尚未触发的路由变化），
        // 标记缓存为脏。
        if (!element.isConnected) {
          topChromeCacheDirty = true;
          continue;
        }
        if (!isVisibleTopChrome(element)) continue;

        topChromeBottom = Math.max(topChromeBottom, element.getBoundingClientRect().bottom);
      }

      // If we filtered out stale entries, refresh now so the next frame has a clean cache.
      // 如果过滤了过期条目，立即刷新以便下一帧使用干净缓存。
      if (topChromeCacheDirty) {
        refreshTopChromeCache();
      }

      const topInset =
        topChromeBottom > 0 ? Math.ceil(topChromeBottom + TOP_CHROME_GAP) : DEFAULT_EDGE_INSET;

      trackElement.style.setProperty('--immersive-scrollbar-inset-block-start', `${topInset}px`);
      trackElement.style.setProperty(
        '--immersive-scrollbar-inset-block-end',
        `${DEFAULT_EDGE_INSET}px`,
      );
    }

    function readMetrics(): ScrollbarMetrics {
      const trackRect = trackElement.getBoundingClientRect();
      const trackHeight = Math.max(trackRect.height, 0);
      // Read both html and body metrics because docs layouts can shift overflow ownership.
      // 同时读取 html/body 指标，兼容文档布局切换滚动归属的情况。
      const viewportHeight = Math.max(window.innerHeight, root.clientHeight);
      const scrollHeight = Math.max(root.scrollHeight, document.body.scrollHeight);
      const maxScroll = Math.max(scrollHeight - viewportHeight, 0);
      const visible = maxScroll > 1 && trackHeight > 0;

      if (!visible) {
        return {
          maxScroll,
          thumbHeight: 0,
          trackHeight,
          visible: false,
        };
      }

      const proportionalHeight = (viewportHeight / scrollHeight) * trackHeight;
      const thumbHeight = clamp(proportionalHeight, MIN_THUMB_HEIGHT, trackHeight);

      return {
        maxScroll,
        thumbHeight,
        trackHeight,
        visible,
      };
    }

    function applyScrollPosition() {
      const scrollTop = Math.max(window.scrollY, root.scrollTop, document.body.scrollTop);
      const thumbTop = getThumbTop(metrics, scrollTop);

      trackElement.style.setProperty('--immersive-scrollbar-thumb-offset', `${thumbTop}px`);
    }

    function getThumbTop(currentMetrics: ScrollbarMetrics, scrollTop: number) {
      const maxThumbTop = Math.max(currentMetrics.trackHeight - currentMetrics.thumbHeight, 0);
      const thumbTop =
        currentMetrics.maxScroll > 0 ? (scrollTop / currentMetrics.maxScroll) * maxThumbTop : 0;

      return clamp(thumbTop, 0, maxThumbTop);
    }

    function applyMetrics() {
      updateChromeOffset();

      metrics = readMetrics();

      trackElement.dataset.visible = metrics.visible ? 'true' : 'false';
      root.classList.toggle(ROOT_ACTIVE_CLASS, metrics.visible);
      trackElement.style.setProperty(
        '--immersive-scrollbar-thumb-height',
        `${metrics.thumbHeight}px`,
      );
      applyScrollPosition();
    }

    function scheduleApplyMetrics() {
      // Skip scheduling while the tab is hidden; visibilitychange handler
      // will trigger a single applyMetrics() on resume.
      // 标签页隐藏时跳过调度；visibilitychange 处理器会在恢复时触发一次 applyMetrics。
      if (layoutAnimationFrame !== 0 || paused) return;

      layoutAnimationFrame = window.requestAnimationFrame(() => {
        layoutAnimationFrame = 0;
        applyMetrics();
      });
    }

    function scheduleScrollPosition() {
      if (scrollAnimationFrame !== 0 || paused) return;

      scrollAnimationFrame = window.requestAnimationFrame(() => {
        scrollAnimationFrame = 0;
        applyScrollPosition();
      });
    }

    function scrollToPointer(clientY: number, offsetY: number) {
      const metrics = readMetrics();
      const trackRect = trackElement.getBoundingClientRect();
      const maxThumbTop = Math.max(metrics.trackHeight - metrics.thumbHeight, 0);
      const nextThumbTop = clamp(clientY - trackRect.top - offsetY, 0, maxThumbTop);
      const scrollRatio = maxThumbTop > 0 ? nextThumbTop / maxThumbTop : 0;

      window.scrollTo({
        behavior: 'auto',
        top: scrollRatio * metrics.maxScroll,
      });
    }

    function handlePointerDown(event: PointerEvent) {
      const currentMetrics = readMetrics();

      if (!currentMetrics.visible || event.button !== 0) return;

      const trackRect = trackElement.getBoundingClientRect();
      const localY = event.clientY - trackRect.top;
      const thumbTop = getThumbTop(
        currentMetrics,
        Math.max(window.scrollY, root.scrollTop, document.body.scrollTop),
      );
      const isThumbHit = localY >= thumbTop && localY <= thumbTop + currentMetrics.thumbHeight;
      const offsetY = isThumbHit ? localY - thumbTop : currentMetrics.thumbHeight / 2;

      event.preventDefault();
      dragState = {
        offsetY,
        pointerId: event.pointerId,
      };
      root.classList.add(ROOT_DRAGGING_CLASS);
      trackElement.setPointerCapture(event.pointerId);
      scrollToPointer(event.clientY, offsetY);
    }

    function handlePointerMove(event: PointerEvent) {
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      event.preventDefault();
      scrollToPointer(event.clientY, dragState.offsetY);
    }

    function finishDragging(event: PointerEvent) {
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      if (trackElement.hasPointerCapture(event.pointerId)) {
        trackElement.releasePointerCapture(event.pointerId);
      }

      dragState = null;
      root.classList.remove(ROOT_DRAGGING_CLASS);
      scheduleApplyMetrics();
    }

    const resizeObserver = new ResizeObserver(scheduleApplyMetrics);
    resizeObserver.observe(root);
    resizeObserver.observe(document.body);

    // Invalidate the top chrome cache when the DOM changes (route navigation,
    // sidebar toggle, TOC popover mount/unmount). childList only — attribute
    // changes (class, style) don't affect which elements match the selector.
    // DOM 变化时（路由导航、侧栏切换、TOC 弹层挂载/卸载）失效顶部控件缓存。
    // 仅监听 childList —— 属性变化（class、style）不影响选择器匹配的元素集合。
    const chromeMutationObserver = new MutationObserver(() => {
      topChromeCacheDirty = true;
      scheduleApplyMetrics();
    });
    chromeMutationObserver.observe(document.body, { childList: true, subtree: true });

    // Scrolling updates only the composited thumb transform. Layout reads for
    // track and top-chrome geometry stay on resize/DOM changes and scroll end,
    // keeping the browser's asynchronous scroll path free of forced layout.
    // 滚动期间仅更新合成层中的 thumb transform；轨道与顶部控件的布局读取
    // 留给 resize、DOM 变化及滚动结束，避免阻塞浏览器异步滚动路径。
    window.addEventListener('scroll', scheduleScrollPosition, { passive: true });
    window.addEventListener('scrollend', scheduleApplyMetrics, { passive: true });
    window.addEventListener('resize', scheduleApplyMetrics);
    trackElement.addEventListener('pointerdown', handlePointerDown);
    trackElement.addEventListener('pointermove', handlePointerMove);
    trackElement.addEventListener('pointerup', finishDragging);
    trackElement.addEventListener('pointercancel', finishDragging);
    applyMetrics();

    // Pause work while the tab is hidden; on resume, run a single synchronous
    // update so the thumb reflects the current scroll position immediately.
    // 标签页隐藏时暂停；恢复时执行一次同步更新，使 thumb 立即反映当前滚动位置。
    const handleVisibilityChange = () => {
      paused = document.hidden;
      if (layoutAnimationFrame !== 0) {
        window.cancelAnimationFrame(layoutAnimationFrame);
        layoutAnimationFrame = 0;
      }
      if (scrollAnimationFrame !== 0) {
        window.cancelAnimationFrame(scrollAnimationFrame);
        scrollAnimationFrame = 0;
      }
      if (!paused) {
        applyMetrics();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (layoutAnimationFrame !== 0) {
        window.cancelAnimationFrame(layoutAnimationFrame);
      }
      if (scrollAnimationFrame !== 0) {
        window.cancelAnimationFrame(scrollAnimationFrame);
      }

      resizeObserver.disconnect();
      chromeMutationObserver.disconnect();
      window.removeEventListener('scroll', scheduleScrollPosition);
      window.removeEventListener('scrollend', scheduleApplyMetrics);
      window.removeEventListener('resize', scheduleApplyMetrics);
      trackElement.removeEventListener('pointerdown', handlePointerDown);
      trackElement.removeEventListener('pointermove', handlePointerMove);
      trackElement.removeEventListener('pointerup', finishDragging);
      trackElement.removeEventListener('pointercancel', finishDragging);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      root.classList.remove(ROOT_READY_CLASS, ROOT_ACTIVE_CLASS, ROOT_DRAGGING_CLASS);
    };
  }, []);

  return (
    <div ref={trackRef} aria-hidden="true" className="immersive-scrollbar" data-visible="false">
      <div className="immersive-scrollbar__thumb" />
    </div>
  );
}
