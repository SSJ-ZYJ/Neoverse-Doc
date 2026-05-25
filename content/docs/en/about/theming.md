---
title: Liquid Glass Theme
description: Achieving liquid glass aesthetics with CSS variables and Tailwind v4
---

Theme styles are centralized in [src/app/globals.css](../../../src/app/globals.css), following a three-tier architecture of "Variable Layer / Utility Classes / Component Overrides".

## Variable Layer

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
  /* ...other tokens synchronized */
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

## Utility Classes

`.liquid-glass` is the core utility class available globally in the project, responsible for frosted glass container effects.

## Tailwind v4 Integration

CSS variables are mapped to Tailwind theme tokens via `@theme inline { ... }`, allowing direct use of utility classes like `bg-background` in JSX.

> Further theme transition animations and `next-themes` integration examples will be continuously improved.
