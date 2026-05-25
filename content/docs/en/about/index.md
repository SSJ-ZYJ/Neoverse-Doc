---
title: About the Project
description: Learn about the complete structure and design philosophy of Neoverse-Doc
---

Neoverse-Doc is a purely static documentation site built with **Next.js 16** + **React 19** + **fumadocs**, delivering a unique tech-aesthetic reading experience across all devices.

## Core Features

- **Pure Static Generation (SSG)** — `next build` directly generates complete HTML with no Node.js runtime, deployable to Vercel, Cloudflare Pages, GitHub Pages, and any static hosting platform
- **MDX-Driven Documentation** — Write with a mix of Markdown and React components, supporting GFM tables, task lists, Mermaid diagrams, and rich syntax
- **Bilingual i18n** — Zero hardcoded dictionary-based copy management, covering fumadocs built-in UI and custom project copy
- **Liquid Glass Theme** — CSS variables + Tailwind v4 for frosted glass effects, with automatic light/dark mode switching
- **Giscus Community Interaction** — GitHub Discussions-based guestbook with embedded comments at the bottom of every document page

## Tech Stack

| Category | Solution |
| :--- | :--- |
| Framework | Next.js 16 (Turbopack + App Router) |
| Runtime | React 19 |
| Docs Engine | fumadocs-core + fumadocs-ui + fumadocs-mdx |
| Styles | Tailwind CSS v4 + CSS Variables |
| Type Checking | TypeScript 5 (strict) |
| Code Quality | Biome 2.4 |

## Chapter Map

### Chapter 0 — Things You Should Know

Foundational knowledge and introductory guide for computer science freshmen.

- [Preface](../ch0): The original intent of the project, content coverage, and document structure

### Contributing

Join us in building Neoverse-Doc!

- [How to Contribute](../contributing): Entry point and overview for contributions
- [Contribution Guide](../contributing/guide): Complete code standards, commit conventions, and PR workflow
- [Markdown Syntax Examples](../contributing/syntax-example): GFM and Mermaid diagram syntax reference

### Project Architecture

Deep dive into the internals of Neoverse-Doc.

- [i18n Internationalization](./i18n): Multi-language architecture, language pack structure, and copy management
- [Liquid Glass Theme](./theming): CSS variable layer, `@theme inline`, and dark mode integration
- [Search & Indexing](./search): fumadocs-core built-in search integration and static export adaptation
