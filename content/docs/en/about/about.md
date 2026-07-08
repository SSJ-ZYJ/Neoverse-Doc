---
title: About This Project
description: Learn about the complete structure and design philosophy of the Neoverse-Docs project
author:
  - "Shenshijun(https://github.com/SSJ-ZYJ)"
---

Neoverse-Docs is a purely static documentation site built on **Next.js 16** + **React 19** + **fumadocs**, designed to provide an immersive reading experience across all devices with a unique tech-aesthetic style.

## Core Features

- **Static Site Generation (SSG)** — `next build` directly generates complete HTML without requiring a Node runtime, deployable to any static hosting platform such as Vercel, Cloudflare Pages, GitHub Pages, etc.
- **MDX-Driven Content** — Mixed writing with Markdown + React components, supporting rich syntax including GFM tables, task lists, Mermaid diagrams, LaTeX formulas, etc.
- **Bilingual i18n** — Zero hard-coded dictionary-style text management, covering fumadocs built-in UI and project custom text.
- **Liquid Glass Theme** — Frosted glass texture implemented with CSS variables + Tailwind v4, with automatic light/dark mode adaptation.
- **Giscus Community Interaction** — Comment wall based on GitHub Discussions, with comment sections embedded at the bottom of every document.

## Tech Stack

| Category | Solution |
| :--- | :--- |
| Framework | Next.js 16 (Turbopack + App Router) |
| Runtime | React 19 |
| Documentation Engine | fumadocs-core + fumadocs-ui + fumadocs-mdx |
| Styling | Tailwind CSS v4 + CSS Variables |
| Type Checking | TypeScript 5 (strict) |
| Code Quality | Biome 2.4 |
