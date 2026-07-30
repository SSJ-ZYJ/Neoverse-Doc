// Inline-code wrap detection marks only genuinely fragmented code spans so CSS
// can distinguish multi-line continuations without changing Markdown semantics.
// 行内代码换行检测仅标记真实产生分片的代码，以便 CSS 区分多行续接，同时保持 Markdown 语义不变。
'use client';

import { useEffect } from 'react';

const INLINE_CODE_SELECTOR = ':not(pre) > code';
const DOCS_BODY_SELECTOR = '[data-docs-body]';
const WRAPPED_ATTRIBUTE = 'data-inline-code-wrapped';
const MARKER_LAYER_CLASS = 'inline-code-continuation-layer';
const MARKER_CLASS = 'inline-code-continuation-marker';
const MARKER_WIDTH_REM = 0.7;
const MARKER_EDGE_OFFSET_REM = 0.36;
const MARKER_BOTTOM_OFFSET_REM = 0.08;
const MARKER_HEIGHT_PX = 1;

/**
 * Checks whether an inserted subtree can change inline-code fragmentation.
 * 检查新增子树是否可能改变行内代码的分片状态。
 */
function containsInlineCode(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  return node.matches(INLINE_CODE_SELECTOR) || node.querySelector(INLINE_CODE_SELECTOR) !== null;
}

/**
 * Tracks responsive inline-code wrapping after route, font, and container-size changes.
 * 跟踪路由、字体与容器尺寸变化后的响应式行内代码换行状态。
 */
export function InlineCodeWrapController() {
  useEffect(() => {
    let frameId = 0;
    let disposed = false;

    // One document-level overlay draws only internal fragment junctions, avoiding
    // unstable text-node splitting inside React-owned MDX content.
    // 单一文档级覆盖层仅绘制内部片段连接点，避免拆分 React 管理的 MDX 文本节点。
    const markerLayer = document.createElement('span');
    markerLayer.className = MARKER_LAYER_CLASS;
    markerLayer.setAttribute('aria-hidden', 'true');
    document.body.append(markerLayer);

    const resizeObserver = new ResizeObserver(() => scheduleUpdate());

    const updateWrappedState = () => {
      frameId = 0;
      const markerFragment = document.createDocumentFragment();
      const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
      const rem = Number.isFinite(rootFontSize) ? rootFontSize : 16;
      const markerWidth = MARKER_WIDTH_REM * rem;
      const edgeOffset = MARKER_EDGE_OFFSET_REM * rem;
      const bottomOffset = MARKER_BOTTOM_OFFSET_REM * rem;

      document.querySelectorAll<HTMLElement>(DOCS_BODY_SELECTOR).forEach((body) => {
        resizeObserver.observe(body);
      });
      document.querySelectorAll<HTMLElement>(INLINE_CODE_SELECTOR).forEach((code) => {
        const rects = [...code.getClientRects()];
        const wrapped = rects.length > 1;
        code.toggleAttribute(WRAPPED_ATTRIBUTE, wrapped);
        if (!wrapped) return;

        // Each junction receives one marker at the previous fragment end and
        // one at the following fragment start; the outermost ends stay clean.
        // 每个连接点在上一片段末端和下一片段首端各绘制一个刻度，整体首尾保持干净。
        for (let index = 0; index < rects.length - 1; index += 1) {
          const previous = rects[index];
          const next = rects[index + 1];
          if (!previous || !next) continue;

          const markerY = previous.bottom + window.scrollY - bottomOffset - MARKER_HEIGHT_PX;
          const nextMarkerY = next.bottom + window.scrollY - bottomOffset - MARKER_HEIGHT_PX;
          const positions = [
            {
              x: previous.right + window.scrollX - edgeOffset - markerWidth,
              y: markerY,
            },
            {
              x: next.left + window.scrollX + edgeOffset,
              y: nextMarkerY,
            },
          ];

          for (const position of positions) {
            const marker = document.createElement('span');
            marker.className = MARKER_CLASS;
            marker.style.setProperty('--inline-code-marker-x', `${position.x}px`);
            marker.style.setProperty('--inline-code-marker-y', `${position.y}px`);
            markerFragment.append(marker);
          }
        }
      });
      markerLayer.replaceChildren(markerFragment);
    };

    const scheduleUpdate = () => {
      if (frameId || disposed) return;
      frameId = window.requestAnimationFrame(updateWrappedState);
    };

    const mutationObserver = new MutationObserver((records) => {
      const affectsInlineCode = records.some((record) => {
        if (record.type === 'characterData') {
          return record.target.parentElement?.closest(INLINE_CODE_SELECTOR) !== null;
        }
        return [...record.addedNodes].some(containsInlineCode);
      });
      if (affectsInlineCode) scheduleUpdate();
    });

    mutationObserver.observe(document.body, {
      characterData: true,
      childList: true,
      subtree: true,
    });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    scheduleUpdate();
    void document.fonts.ready.then(scheduleUpdate);

    return () => {
      disposed = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
      markerLayer.remove();
      document.querySelectorAll<HTMLElement>(`[${WRAPPED_ATTRIBUTE}]`).forEach((code) => {
        code.removeAttribute(WRAPPED_ATTRIBUTE);
      });
    };
  }, []);

  return null;
}
