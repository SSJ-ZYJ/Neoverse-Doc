---
title: Liquid Glass Theme
description: Achieve a liquid glass aesthetic with CSS variables and Tailwind v4
---

The theme styles are centralized in [src/app/globals.css](../../../src/app/globals.css) and follow a three-layer pattern: "variables / utilities / component overrides".

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
  /* ...and other tokens kept in sync */
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

`.liquid-glass` is the project-wide utility class available globally — it handles the frosted-glass container effect.

## Tailwind v4 Integration

`@theme inline { ... }` maps CSS variables into Tailwind theme tokens, so you can use utilities like `bg-background` directly in JSX.

> Further work on theme-switching animations and deeper `next-themes` integration examples will continue to land here.
