---
title: 玻璃感主题
description: 液态玻璃设计系统 — CSS 变量、Tailwind v4 与环境光效果
author:
  - "Shenshijun(https://github.com/SSJ-ZYJ)"
---

Neoverse-Doc 采用「液态玻璃（Liquid Glass）」设计语言，主题样式集中在 [src/app/globals.css](file:///d:/SSJ/Projects/Neoverse-Doc/src/app/globals.css)，遵循「变量层 → 工具类 → 组件覆写」三段式架构。

## 变量层

### 基础变量

```css
:root {
  --background: #ffffff;
  --foreground: #0f172a;
  --glass-blur: 20px;
  --glass-blur-strong: 28px;
  --glass-blur-soft: 12px;
  --glass-saturate: 180%;
}

[data-theme="dark"], .dark {
  --background: #060913;
  --foreground: #f8fafc;
}
```

### 液态玻璃设计系统

```css
/* 浅色模式 */
:root {
  --glass-bg: rgba(255, 255, 255, 0.6);
  --glass-border: rgba(15, 23, 42, 0.1);
  --glass-tint: rgba(248, 250, 252, 0.6);
  --glass-tint-strong: rgba(255, 255, 255, 0.85);
  --glass-tint-soft: rgba(255, 255, 255, 0.4);
  --glass-border-hairline: rgba(15, 23, 42, 0.08);
  --glass-highlight: rgba(255, 255, 255, 1);
  --glass-shadow: 0 8px 32px -8px rgba(15, 23, 42, 0.18);
  --glass-shadow-hover: 0 12px 32px -8px rgba(15, 23, 42, 0.25);
  --glass-ambient-a: rgba(56, 189, 248, 0.18); /* 浅蓝环境光 */
  --glass-ambient-b: rgba(74, 222, 128, 0.14); /* 浅绿环境光 */
  --color-brand-start: #38bdf8;
  --color-brand-end: #4ade80;
}

/* 深色模式 */
[data-theme="dark"], .dark {
  --glass-bg: rgba(15, 23, 42, 0.4);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-tint: rgba(15, 23, 42, 0.42);
  --glass-tint-strong: rgba(15, 23, 42, 0.55);
  --glass-tint-soft: rgba(15, 23, 42, 0.28);
  --glass-border-hairline: rgba(255, 255, 255, 0.08);
  --glass-highlight: rgba(255, 255, 255, 0.18);
  --glass-shadow: 0 12px 40px -8px rgba(255, 255, 255, 0.3);
  --glass-shadow-hover: 0 12px 44px -10px rgba(255, 255, 255, 0.22);
  --glass-ambient-a: rgba(56, 189, 248, 0.16); /* 深色模式浅蓝 */
  --glass-ambient-b: rgba(168, 85, 247, 0.12); /* 紫色环境光 */
}
```

### fumadocs Token 映射

```css
/* 覆盖 fumadocs 默认 token，实现主题一致性 */
--color-fd-background: var(--background);
--color-fd-foreground: var(--foreground);
--color-fd-card: var(--background);
--color-fd-card-foreground: var(--foreground);
--color-fd-secondary: var(--background);
--color-fd-secondary-foreground: var(--foreground);
--color-fd-muted: rgba(0, 0, 0, 0.04);
--color-fd-muted-foreground: rgba(0, 0, 0, 0.5);
--color-fd-border: rgba(0, 0, 0, 0.08);
--fd-primary: #0ea5e9;
```

## 工具类

### 玻璃元件系统

| 类名 | 用途 | 特性 |
| :--- | :--- | :--- |
| `.glass-panel` | 大面板（导航 / 侧栏） | blur + 内顶高光 + 外阴影 |
| `.glass-card` | 弹窗 / 抽屉 / 搜索框 | 强 blur + 浓 tint + 大圆角 |
| `.glass-chip` | 小元件（按钮 / 标签） | 轻 blur + 软 tint |
| `.glass-edge` | 已有背景的元素 | 描边 + 内高光（无 blur） |
| `.glass-cta` | 首页 CTA 按钮 | 独立 blur 与阴影强度 |

```css
/* glass-panel: 大面板基础样式 */
.glass-panel {
  background-color: var(--glass-tint);
  border: 1px solid var(--glass-border-hairline);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  box-shadow:
    inset 0 1px 0 var(--glass-highlight),
    var(--glass-shadow);
}

/* glass-card: 弹窗 / 抽屉 */
.glass-card {
  background-color: var(--glass-tint-strong);
  border-radius: 1rem;
  /* 更强的 blur + 更浓的 tint */
}

/* glass-chip: 小元件 */
.glass-chip {
  background-color: var(--glass-tint-soft);
  /* 轻 blur，无外阴影 */
}
```

## 环境光效果

```css
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image:
    radial-gradient(60vmax 60vmax at 15% 20%, var(--glass-ambient-a), transparent 60%),
    radial-gradient(60vmax 60vmax at 85% 80%, var(--glass-ambient-b), transparent 60%);
  filter: blur(80px) saturate(140%);
}
```

通过两个径向渐变模拟环境折射光，为玻璃表面提供动态色彩来源。

## fumadocs 表面玻璃化

```css
/* 顶部导航栏 */
:where(#nd-nav) > div {
  background-color: var(--glass-tint) !important;
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border-bottom-color: var(--glass-border-hairline);
  box-shadow: inset 0 1px 0 var(--glass-highlight);
}

/* 文档侧边栏（展开态） */
:where(#nd-sidebar):not([data-collapsed="true"]) {
  background-color: var(--glass-tint);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border-inline-end-color: var(--glass-border-hairline);
  box-shadow: inset 0 1px 0 var(--glass-highlight);
}

/* 搜索弹窗 */
[role="dialog"][data-state="open"]:has(input) {
  background-color: var(--glass-tint-soft) !important;
  border: 1px solid var(--glass-border-hairline) !important;
  box-shadow:
    inset 0 0 0 1px var(--glass-highlight),
    var(--glass-shadow) !important;
}
```

## Tailwind v4 接入

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-orbitron: var(--font-orbitron);
  --font-noto-sans: var(--font-noto-sans);
  --font-mono: "Maple Mono NF CN", "JetBrains Mono", monospace;
}
```

通过 `@theme inline` 将 CSS 变量映射为 Tailwind 主题 token，可在 JSX 中直接使用 `bg-background`、`text-foreground` 等语义化工具类。

## 无障碍支持

```css
/* 用户偏好减少透明度：退化为不透明背景 */
@media (prefers-reduced-transparency: reduce) {
  .glass-panel,
  .glass-card,
  .glass-chip,
  .glass-cta {
    background-color: var(--background) !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
    box-shadow: none !important;
  }
  body::before {
    display: none;
  }
}

/* 浏览器不支持 backdrop-filter：同样退化 */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  /* ... */
}
```

## 主题切换

`next-themes` 通过 `data-theme` 属性驱动 CSS 变量切换：

```tsx
<ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

- `data-theme="light"` / `.light`：浅色模式
- `data-theme="dark"` / `.dark`：深色模式
- 无属性：跟随系统偏好（`prefers-color-scheme`）

> 更多主题切换动效与 framer-motion 集成示例持续完善中。