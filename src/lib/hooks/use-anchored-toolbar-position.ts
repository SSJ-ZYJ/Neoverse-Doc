/**
 * Positions a portaled toolbar against an in-page anchor without React updates on scroll.
 * Work is coalesced to one animation frame and suspended while the anchor is off-screen.
 *
 * The toolbar is clamped horizontally within the anchor's bounding rect so it never
 * escapes the mermaid wrapper's horizontal extent (previously it could overflow the
 * right edge on wide diagrams or when the wrapper was near the viewport edge).
 *
 * 在不触发 React 滚动更新的前提下，将 Portal 工具栏锚定到页面内元素。
 * 定位工作合并到每帧一次，并在锚点离屏时暂停。
 * 工具栏水平方向被钳制在锚点的包围盒内，确保不会超出 mermaid wrapper 的水平范围
 * （此前在宽图表或 wrapper 靠近视口边缘时，工具栏可能溢出右边缘）。
 */

'use client';

import { type RefObject, useEffect } from 'react';

const TOOLBAR_BOTTOM_OFFSET = 12;
// Padding kept between the toolbar edge and the anchor's left/right edge so the
// glass chip doesn't sit flush against the wrapper border.
// 工具栏边缘与锚点左/右边缘之间保留的内边距，使玻璃 chip 不会紧贴 wrapper 边框。
const TOOLBAR_HORIZONTAL_MARGIN = 8;

export function useAnchoredToolbarPosition(
  anchorRef: RefObject<HTMLElement | null>,
  toolbarRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  maximized: boolean,
) {
  useEffect(() => {
    const anchor = anchorRef.current;
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    if (maximized) {
      clearInlinePosition(toolbar);
      return;
    }

    if (!enabled || !anchor) {
      toolbar.style.visibility = 'hidden';
      return () => clearInlinePosition(toolbar);
    }

    let frameId: number | null = null;
    let isIntersecting = true;

    const hideToolbar = () => {
      toolbar.style.visibility = 'hidden';
    };

    const updatePosition = () => {
      frameId = null;
      if (!isIntersecting) {
        hideToolbar();
        return;
      }

      const anchorRect = anchor.getBoundingClientRect();
      if (
        anchorRect.bottom < 0 ||
        anchorRect.top > window.innerHeight ||
        anchorRect.right < 0 ||
        anchorRect.left > window.innerWidth
      ) {
        hideToolbar();
        return;
      }

      const toolbarWidth = toolbar.offsetWidth;
      // Center the toolbar under the anchor, then clamp within the anchor's
      // horizontal extent (with a small margin) so it always stays inside the
      // mermaid wrapper's bounding box. When the anchor is narrower than the
      // toolbar, the clamp keeps the toolbar's left edge at the anchor's left
      // margin so it overflows symmetrically rather than escaping the wrapper.
      // 将工具栏居中放置在锚点下方，然后在锚点的水平范围内（带小边距）钳制，
      // 确保始终位于 mermaid wrapper 的包围盒内。当锚点比工具栏窄时，钳制
      // 将工具栏左边缘固定在锚点左侧边距处，使其对称溢出而非逃出 wrapper。
      const centeredLeft = anchorRect.left + anchorRect.width / 2 - toolbarWidth / 2;
      const minLeft = anchorRect.left + TOOLBAR_HORIZONTAL_MARGIN;
      const maxLeft = anchorRect.right - TOOLBAR_HORIZONTAL_MARGIN - toolbarWidth;
      const left =
        maxLeft >= minLeft ? Math.max(minLeft, Math.min(centeredLeft, maxLeft)) : minLeft;
      const top = anchorRect.bottom - TOOLBAR_BOTTOM_OFFSET - toolbar.offsetHeight;

      toolbar.style.position = 'fixed';
      toolbar.style.left = `${Math.round(left)}px`;
      toolbar.style.top = `${Math.round(top)}px`;
      toolbar.style.visibility = 'visible';
    };

    const schedulePositionUpdate = () => {
      if (!isIntersecting || frameId !== null) return;
      frameId = window.requestAnimationFrame(updatePosition);
    };

    const intersectionObserver =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            isIntersecting = entry?.isIntersecting ?? false;
            if (isIntersecting) schedulePositionUpdate();
            else hideToolbar();
          });
    intersectionObserver?.observe(anchor);

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedulePositionUpdate);
    resizeObserver?.observe(anchor);
    resizeObserver?.observe(toolbar);

    const mutationObserver = new MutationObserver(schedulePositionUpdate);
    if (anchor.parentElement) {
      mutationObserver.observe(anchor.parentElement, {
        subtree: false,
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'data-collapsed'],
      });
    }

    window.addEventListener('scroll', schedulePositionUpdate, { passive: true });
    window.addEventListener('resize', schedulePositionUpdate);
    schedulePositionUpdate();

    return () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('scroll', schedulePositionUpdate);
      window.removeEventListener('resize', schedulePositionUpdate);
      clearInlinePosition(toolbar);
    };
  }, [anchorRef, enabled, maximized, toolbarRef]);
}

function clearInlinePosition(toolbar: HTMLElement) {
  toolbar.style.removeProperty('left');
  toolbar.style.removeProperty('top');
  toolbar.style.removeProperty('position');
  toolbar.style.removeProperty('visibility');
}
