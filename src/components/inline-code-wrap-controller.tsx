// Inline-code wrap detection marks only genuinely fragmented code spans so CSS
// can distinguish multi-line continuations without changing Markdown semantics.
// 行内代码换行检测仅标记真实产生分片的代码，以便 CSS 区分多行续接，同时保持 Markdown 语义不变。
'use client';

import { useEffect } from 'react';

const DOCS_BODY_SELECTOR = '[data-docs-body]';
const INLINE_CODE_NODE_SELECTOR = ':not(pre) > code';
const INLINE_CODE_SELECTOR = `${DOCS_BODY_SELECTOR} ${INLINE_CODE_NODE_SELECTOR}`;
const WRAPPED_ATTRIBUTE = 'data-inline-code-wrapped';
const LEGACY_MARKER_LAYER_SELECTOR = '.inline-code-continuation-layer';

/**
 * Checks whether an inserted or removed subtree contains a docs body.
 * 检查新增或移除的子树是否包含文档正文。
 */
function containsDocsBody(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  return node.matches(DOCS_BODY_SELECTOR) || node.querySelector(DOCS_BODY_SELECTOR) !== null;
}

/**
 * Tracks responsive inline-code wrapping after route, font, and container-size changes.
 * 跟踪路由、字体与容器尺寸变化后的响应式行内代码换行状态。
 */
export function InlineCodeWrapController() {
  useEffect(() => {
    let frameId = 0;
    let disposed = false;

    // Remove marker layers created by earlier builds or retained during Fast
    // Refresh. Wrapped decoration now stays on the code element itself.
    // 清理旧版本或热更新期间遗留的标记层；换行装饰现在完全由 code 元素承载。
    document.querySelectorAll(LEGACY_MARKER_LAYER_SELECTOR).forEach((layer) => {
      layer.remove();
    });

    const observedBodies = new Set<HTMLElement>();
    const resizeObserver = new ResizeObserver(() => scheduleUpdate());

    const updateWrappedState = () => {
      frameId = 0;

      const currentBodies = new Set(document.querySelectorAll<HTMLElement>(DOCS_BODY_SELECTOR));
      for (const body of observedBodies) {
        if (currentBodies.has(body)) continue;
        resizeObserver.unobserve(body);
        observedBodies.delete(body);
      }
      for (const body of currentBodies) {
        if (observedBodies.has(body)) continue;
        resizeObserver.observe(body);
        observedBodies.add(body);
      }

      document.querySelectorAll<HTMLElement>(INLINE_CODE_SELECTOR).forEach((code) => {
        const rects = [...code.getClientRects()].filter(
          (rect) => rect.width > 0.5 && rect.height > 0.5,
        );
        const wrapped = rects.length > 1;
        code.toggleAttribute(WRAPPED_ATTRIBUTE, wrapped);
      });
    };

    const scheduleUpdate = () => {
      if (frameId || disposed) return;
      frameId = window.requestAnimationFrame(updateWrappedState);
    };

    const mutationObserver = new MutationObserver((records) => {
      const affectsDocsLayout = records.some((record) => {
        if (record.type === 'characterData') {
          return record.target.parentElement?.closest(DOCS_BODY_SELECTOR) !== null;
        }

        const targetElement =
          record.target instanceof Element ? record.target : record.target.parentElement;
        if (
          targetElement?.matches(DOCS_BODY_SELECTOR) ||
          targetElement?.closest(DOCS_BODY_SELECTOR)
        ) {
          return true;
        }

        return [...record.addedNodes, ...record.removedNodes].some(containsDocsBody);
      });
      if (affectsDocsLayout) scheduleUpdate();
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
