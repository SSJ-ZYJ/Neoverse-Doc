/**
 * Tabs wrapper that replaces fumadocs's per-tab border-b toggle with a
 * single sliding underline indicator. The indicator's position and width
 * are exposed as CSS variables on the Tabs root, and the matching ::after
 * in fumadocs-glass.css applies a cubic-bezier transition.
 *
 * Tabs 包装组件：把 fumadocs 默认"每个 Tab 各自 border-b 切换"替换为
 * 一根共用下划线在 Tab 间平滑滑动 + 宽度补间。激活 Tab 的 offsetLeft /
 * offsetWidth 通过 CSS 变量暴露给 Tabs 根节点，由 fumadocs-glass.css 里
 * 对应的 ::after 伪元素读取并以 cubic-bezier 缓动过渡。
 */

'use client';

import { Tab as FumadocsTab, Tabs as FumadocsTabs } from 'fumadocs-ui/components/tabs';
import { type ComponentProps, useEffect, useRef } from 'react';

export function Tabs(props: ComponentProps<typeof FumadocsTabs>) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const tablist = root.querySelector<HTMLElement>(':scope > [role="tablist"]');
    if (!tablist) return;

    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const active = tablist.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
        if (!active) {
          // No active tab yet (initial mount before fumadocs hydrates persisted state).
          // 还没有激活项时（fumadocs 还没把持久化状态注水回来），把指示器宽度置 0 隐藏。
          root.style.setProperty('--tab-indicator-w', '0px');
          return;
        }
        root.style.setProperty('--tab-indicator-x', `${active.offsetLeft}px`);
        root.style.setProperty('--tab-indicator-w', `${active.offsetWidth}px`);
      });
    };

    update();

    // data-state flips on click / keyboard nav / cross-group groupId sync.
    // 监听 data-state 切换：点击 / 键盘 / groupId 跨组同步都会触发。
    const mo = new MutationObserver(update);
    mo.observe(tablist, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state'],
    });

    // Layout changes (window resize, font swap, container reflow).
    // 布局变化：窗口缩放 / 字体加载完成 / 容器宽度变更。
    const ro = new ResizeObserver(update);
    ro.observe(tablist);
    for (const tab of tablist.querySelectorAll<HTMLElement>('[role="tab"]')) {
      ro.observe(tab);
    }

    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      ro.disconnect();
    };
  }, []);

  // Spread props first so our ref wins if a caller ever passes one.
  // 先展开 props，再绑 ref，确保我们的 ref 不被覆盖。
  return <FumadocsTabs {...props} ref={rootRef} />;
}

export const Tab = FumadocsTab;
