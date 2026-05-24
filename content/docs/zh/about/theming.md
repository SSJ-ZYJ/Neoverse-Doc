---
title: 玻璃感主题
description: 通过 CSS 变量与 Tailwind v4 实现液态玻璃质感
---

主题样式集中在 [src/app/globals.css](../../../src/app/globals.css)，遵循「变量层 / 工具类 / 组件覆写」三段式。

## 变量层

```css
:root {
  --background: #ffffff;
  --foreground: #0f172a;
  --glass-bg: rgba(255, 255, 255, 0.6);
  --glass-border: rgba(255, 255, 255, 0.4);
  --color-brand-start: #38bdf8;
  --color-brand-end: #4ade80;
  --color-fd-background: var(--background);
  --color-fd-foreground: var(--foreground);
  --color-fd-card: var(--background);
  --color-fd-secondary: var(--background);
  /* ...其余 token 同步 */
}

[data-theme="dark"], .dark {
  --background: #060913;
  --foreground: #f8fafc;
  --glass-bg: rgba(15, 23, 42, 0.4);
  --glass-border: rgba(255, 255, 255, 0.1);
  --color-fd-background: var(--background);
  --color-fd-foreground: var(--foreground);
  --color-fd-card: var(--background);
  --color-fd-secondary: var(--background);
  --color-fd-border: rgba(255, 255, 255, 0.08);
}
```

## 工具类

`.liquid-glass` 是项目内全局可用的核心工具类，负责毛玻璃容器效果。

## Tailwind v4 接入

通过 `@theme inline { ... }` 将 CSS 变量映射为 Tailwind 主题 token，可在 JSX 中直接使用 `bg-background` 等工具类。

> 进一步的主题切换动效与 `next-themes` 集成示例会持续完善。
