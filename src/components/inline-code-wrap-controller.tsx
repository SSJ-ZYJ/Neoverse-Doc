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
const WRAPPED_HEIGHT_RATIO = 1.5;

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
    const observedCodes = new Set<HTMLElement>();
    const visibleCodes = new Set<HTMLElement>();
    const observedBodyWidths = new WeakMap<HTMLElement, number>();
    const resizeObserver = new ResizeObserver((entries) => {
      const widthChanged = entries.some((entry) => {
        const body = entry.target as HTMLElement;
        const width = entry.contentRect.width;
        const previousWidth = observedBodyWidths.get(body);
        observedBodyWidths.set(body, width);
        // A newly observed body has already been measured by the update that
        // registered it. Only later width changes can alter inline wrapping.
        // 新正文在注册 Observer 的同一轮更新中已经完成测量；只有后续宽度变化
        // 才可能改变行内代码的换行状态。
        return previousWidth !== undefined && Math.abs(previousWidth - width) > 0.5;
      });
      if (widthChanged) scheduleUpdate();
    });

    const measureCodes = (codes: Iterable<HTMLElement>) => {
      // Read every visible fragment geometry before changing attributes.
      // Interleaving each read with a write forces layout again for the next node.
      // 先批量读取全部可见分片几何，再统一写入属性；逐节点读写交错会让后续
      // code 节点反复触发强制同步布局。
      const measurements = Array.from(codes, (code) => {
        const height = code.getBoundingClientRect().height;
        const lineHeight = Number.parseFloat(getComputedStyle(code).lineHeight);
        return {
          code,
          wrapped: Number.isFinite(lineHeight) && height > lineHeight * WRAPPED_HEIGHT_RATIO,
        };
      });
      for (const { code, wrapped } of measurements) {
        if (code.hasAttribute(WRAPPED_ATTRIBUTE) === wrapped) continue;
        code.toggleAttribute(WRAPPED_ATTRIBUTE, wrapped);
      }
    };

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const enteringCodes: HTMLElement[] = [];
        for (const entry of entries) {
          const code = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            visibleCodes.add(code);
            enteringCodes.push(code);
          } else {
            visibleCodes.delete(code);
          }
        }
        measureCodes(enteringCodes);
      },
      // Prepare one viewport ahead so wrapped decoration is ready before scroll.
      // 提前测量上下各一屏，使换行装饰在滚入视口前准备完成。
      { rootMargin: '100% 0px' },
    );

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

      const currentCodes = new Set(
        Array.from(document.querySelectorAll<HTMLElement>(INLINE_CODE_SELECTOR)).filter(
          (code) => !code.closest('[data-particle-capture]'),
        ),
      );
      for (const code of observedCodes) {
        if (currentCodes.has(code)) continue;
        intersectionObserver.unobserve(code);
        observedCodes.delete(code);
        visibleCodes.delete(code);
      }
      for (const code of currentCodes) {
        if (observedCodes.has(code)) continue;
        intersectionObserver.observe(code);
        observedCodes.add(code);
      }

      measureCodes(visibleCodes);
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
      intersectionObserver.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
      document.querySelectorAll<HTMLElement>(`[${WRAPPED_ATTRIBUTE}]`).forEach((code) => {
        code.removeAttribute(WRAPPED_ATTRIBUTE);
      });
    };
  }, []);

  return null;
}
