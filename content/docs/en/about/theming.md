---
title: Liquid Glass Theme
description: Liquid Glass design system — CSS variables, Tailwind v4, and ambient lighting effects
---

Neoverse-Doc employs a "Liquid Glass" design language. Theme styles are centralized in [src/app/globals.css](file:///d:/SSJ/Projects/Neoverse-Doc/src/app/globals.css), following a three-tier architecture of "Variable Layer → Utility Classes → Component Overrides".

## Variable Layer

### Base Variables

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

### Liquid Glass Design System

```css
/* Light Mode */
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
  --glass-ambient-a: rgba(56, 189, 248, 0.18); /* Light Blue Ambient */
  --glass-ambient-b: rgba(74, 222, 128, 0.14); /* Light Green Ambient */
  --color-brand-start: #38bdf8;
  --color-brand-end: #4ade80;
}

/* Dark Mode */
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
  --glass-ambient-a: rgba(56, 189, 248, 0.16); /* Dark Mode Light Blue */
  --glass-ambient-b: rgba(168, 85, 247, 0.12); /* Purple Ambient */
}
```

### fumadocs Token Mapping

```css
/* Override fumadocs default tokens for theme consistency */
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

## Utility Classes

### Glass Component System

| Class | Purpose | Features |
| :--- | :--- | :--- |
| `.glass-panel` | Large panels (nav / sidebar) | blur + inner top highlight + outer shadow |
| `.glass-card` | Modals / drawers / search | Strong blur + dense tint + large border-radius |
| `.glass-chip` | Small elements (buttons / tags) | Light blur + soft tint |
| `.glass-edge` | Elements with existing background | Border + inner highlight (no blur) |
| `.glass-cta` | Homepage CTA buttons | Independent blur and shadow intensity |

```css
/* glass-panel: Large panel base styles */
.glass-panel {
  background-color: var(--glass-tint);
  border: 1px solid var(--glass-border-hairline);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  box-shadow:
    inset 0 1px 0 var(--glass-highlight),
    var(--glass-shadow);
}

/* glass-card: Modals / drawers */
.glass-card {
  background-color: var(--glass-tint-strong);
  border-radius: 1rem;
  /* Stronger blur + denser tint */
}

/* glass-chip: Small elements */
.glass-chip {
  background-color: var(--glass-tint-soft);
  /* Light blur, no outer shadow */
}
```

## Ambient Lighting

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

Two radial gradients simulate ambient refractive light, providing dynamic color sources for glass surfaces.

## fumadocs Surface Glassification

```css
/* Top Navigation Bar */
:where(#nd-nav) > div {
  background-color: var(--glass-tint) !important;
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border-bottom-color: var(--glass-border-hairline);
  box-shadow: inset 0 1px 0 var(--glass-highlight);
}

/* Docs Sidebar (Expanded State) */
:where(#nd-sidebar):not([data-collapsed="true"]) {
  background-color: var(--glass-tint);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border-inline-end-color: var(--glass-border-hairline);
  box-shadow: inset 0 1px 0 var(--glass-highlight);
}

/* Search Dialog */
[role="dialog"][data-state="open"]:has(input) {
  background-color: var(--glass-tint-soft) !important;
  border: 1px solid var(--glass-border-hairline) !important;
  box-shadow:
    inset 0 0 0 1px var(--glass-highlight),
    var(--glass-shadow) !important;
}
```

## Tailwind v4 Integration

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-orbitron: var(--font-orbitron);
  --font-noto-sans: var(--font-noto-sans);
  --font-mono: "Maple Mono NF CN", "JetBrains Mono", monospace;
}
```

CSS variables are mapped to Tailwind theme tokens via `@theme inline`, enabling direct use of semantic utility classes like `bg-background` and `text-foreground` in JSX.

## Accessibility

```css
/* User prefers reduced transparency: degrade to opaque backgrounds */
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

/* Browser doesn't support backdrop-filter: same degradation */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  /* ... */
}
```

## Theme Switching

`next-themes` drives CSS variable switching via the `data-theme` attribute:

```tsx
<ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

- `data-theme="light"` / `.light`: Light mode
- `data-theme="dark"` / `.dark`: Dark mode
- No attribute: Follow system preference (`prefers-color-scheme`)

> More theme transition animations and framer-motion integration examples coming soon.