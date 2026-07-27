// Immersive root scrollbar: replaces the browser viewport scrollbar with a glass thumb.
// 沉浸式根滚动条：用玻璃 thumb 替换浏览器视口原生滚动条。

'use client';

import { useEffect, useRef } from 'react';

interface ScrollbarMetrics {
  maxScroll: number;
  thumbHeight: number;
  thumbTop: number;
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
const TOP_CHROME_SELECTOR = [
  '#nd-nav',
  '#nd-subnav',
  '#nd-docs-layout header.border-b.backdrop-blur-sm',
  '[data-toc-popover]',
  '[data-toc-popover-trigger]',
].join(', ');

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

    let animationFrame = 0;
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

    function updateChromeOffset() {
      let topChromeBottom = 0;

      for (const element of document.querySelectorAll<HTMLElement>(TOP_CHROME_SELECTOR)) {
        if (!isVisibleTopChrome(element)) continue;

        topChromeBottom = Math.max(topChromeBottom, element.getBoundingClientRect().bottom);
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
      const scrollTop = Math.max(window.scrollY, root.scrollTop, document.body.scrollTop);
      const maxScroll = Math.max(scrollHeight - viewportHeight, 0);
      const visible = maxScroll > 1 && trackHeight > 0;

      if (!visible) {
        return {
          maxScroll,
          thumbHeight: 0,
          thumbTop: 0,
          trackHeight,
          visible: false,
        };
      }

      const proportionalHeight = (viewportHeight / scrollHeight) * trackHeight;
      const thumbHeight = clamp(proportionalHeight, MIN_THUMB_HEIGHT, trackHeight);
      const maxThumbTop = Math.max(trackHeight - thumbHeight, 0);
      const thumbTop = maxScroll > 0 ? (scrollTop / maxScroll) * maxThumbTop : 0;

      return {
        maxScroll,
        thumbHeight,
        thumbTop: clamp(thumbTop, 0, maxThumbTop),
        trackHeight,
        visible,
      };
    }

    function applyMetrics() {
      updateChromeOffset();

      const metrics = readMetrics();

      trackElement.dataset.visible = metrics.visible ? 'true' : 'false';
      root.classList.toggle(ROOT_ACTIVE_CLASS, metrics.visible);
      trackElement.style.setProperty(
        '--immersive-scrollbar-thumb-height',
        `${metrics.thumbHeight}px`,
      );
      trackElement.style.setProperty('--immersive-scrollbar-thumb-offset', `${metrics.thumbTop}px`);
    }

    function scheduleApplyMetrics() {
      // Skip scheduling while the tab is hidden; visibilitychange handler
      // will trigger a single applyMetrics() on resume.
      // 标签页隐藏时跳过调度；visibilitychange 处理器会在恢复时触发一次 applyMetrics。
      if (animationFrame !== 0 || paused) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        applyMetrics();
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
      const metrics = readMetrics();

      if (!metrics.visible || event.button !== 0) return;

      const trackRect = trackElement.getBoundingClientRect();
      const localY = event.clientY - trackRect.top;
      const isThumbHit =
        localY >= metrics.thumbTop && localY <= metrics.thumbTop + metrics.thumbHeight;
      const offsetY = isThumbHit ? localY - metrics.thumbTop : metrics.thumbHeight / 2;

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

    window.addEventListener('scroll', scheduleApplyMetrics, { passive: true });
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
      if (animationFrame !== 0) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
      if (!paused) {
        applyMetrics();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (animationFrame !== 0) {
        window.cancelAnimationFrame(animationFrame);
      }

      resizeObserver.disconnect();
      window.removeEventListener('scroll', scheduleApplyMetrics);
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
