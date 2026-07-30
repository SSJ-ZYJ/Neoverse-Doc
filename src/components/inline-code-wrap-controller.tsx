// Inline-code wrap detection marks only genuinely fragmented code spans so CSS
// can distinguish multi-line continuations without changing Markdown semantics.
// 行内代码换行检测仅标记真实产生分片的代码，以便 CSS 区分多行续接，同时保持 Markdown 语义不变。
'use client';

import { useEffect } from 'react';

const INLINE_CODE_SELECTOR = ':not(pre) > code';
const DOCS_BODY_SELECTOR = '[data-docs-body]';
const WRAPPED_ATTRIBUTE = 'data-inline-code-wrapped';

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

    const resizeObserver = new ResizeObserver(() => scheduleUpdate());

    const updateWrappedState = () => {
      frameId = 0;
      document.querySelectorAll<HTMLElement>(DOCS_BODY_SELECTOR).forEach((body) => {
        resizeObserver.observe(body);
      });
      document.querySelectorAll<HTMLElement>(INLINE_CODE_SELECTOR).forEach((code) => {
        code.toggleAttribute(WRAPPED_ATTRIBUTE, code.getClientRects().length > 1);
      });
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
      document.querySelectorAll<HTMLElement>(`[${WRAPPED_ATTRIBUTE}]`).forEach((code) => {
        code.removeAttribute(WRAPPED_ATTRIBUTE);
      });
    };
  }, []);

  return null;
}
