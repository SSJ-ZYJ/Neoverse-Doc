/**
 * Positions a portaled toolbar against an in-page anchor without React updates on scroll.
 * Work is coalesced to one animation frame and suspended while the anchor is off-screen.
 *
 * 在不触发 React 滚动更新的前提下，将 Portal 工具栏锚定到页面内元素。
 * 定位工作合并到每帧一次，并在锚点离屏时暂停。
 */

'use client';

import { type RefObject, useEffect } from 'react';

const TOOLBAR_BOTTOM_OFFSET = 12;

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

      const left = anchorRect.left + anchorRect.width / 2 - toolbar.offsetWidth / 2;
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
