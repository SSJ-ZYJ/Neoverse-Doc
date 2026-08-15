---
id: about/project
title: Project Overview
description: Learn about Neoverse-Docs' positioning, current content, engineering principles, and technical topics
author:
  - "Shenshijun(https://github.com/SSJ-ZYJ)"
---

> [!DETAILS-AI] AI Summary of This Chapter
> Neoverse-Docs is an open-source online learning document for students in computing-related majors, and a static documentation site deeply customized around Fumadocs. The project adheres to content-first, Static-first, Server-first, and Fumadocs-first principles, and uses seven technical topics to explain the project structure, content enhancements, design system, home page and immersive interactions, search and navigation, route transitions, and the Mermaid and performance trade-offs.

## 1. Project positioning

Neoverse-Docs primarily serves students in computing-related majors who lack practical computer usage and development tool fundamentals, while also accommodating self-learners and developers who want to close gaps in their toolchains.

The project focuses on practical abilities that traditional courses often take for granted but that are frequently used in real learning and development, such as file management, searching and asking questions, text expression, Shell, development environments, Git, and Docker. It is a continuously updated online learning document, not a fixed-structure e-book, and for now not a complete programming language, algorithm, or computer theory course.

The engineering goals are equally clear: content must be statically deployable, and core reading must not depend on a long-running backend; visuals and interactions may only enhance content, and long documents must not carry unnecessary JavaScript, network, or GPU costs.

## 2. Current content

| Content | Status | Description |
| :--- | :--- | :--- |
| [Chapter 0: Before You Begin](/en/docs/ch0) | Readable | Introduces the project, learning approach, and site operations |
| [Chapter 1: The Missing Semester](/en/docs/ch1) | Current main line | 7 Stages, 17 sections, moving from everyday tools into Shell, development environments, Git, and Docker |
| [Chapter 2: Introduction to Algorithms](/en/docs/ch2) | Under construction | Currently only the guide and a high-precision algorithm draft exist; the existing examples require C++ fundamentals |
| [About and Contributing](/en/docs/about) | Continuously maintained | Records the project philosophy, technical implementation, contribution process, and author references |

Current content and future directions will be adjusted according to actual writing and feedback. A chapter appearing in the navigation does not mean it has reached the same completeness as Chapter 1.

## 3. Engineering principles

### Content first

Reading and understanding always matter more than decoration. Callouts, task progress, diagrams, animations, and comments exist only to organize content or complete learning actions, and should not burden the main text.

### Static-first

The production environment outputs a fully static site through `output: 'export'`. Core reading, search endpoints, document sources, and multilingual routes can all be served from build artifacts, without introducing a database or account system.

### Server-first

React components remain Server Components by default. Small client boundaries are created only when state, interactions, or browser APIs truly require them, avoiding the client-side conversion of long articles or entire component trees.

### Fumadocs-first

Page tree, MDX, TOC, search, and internationalization prioritize Fumadocs' public capabilities. Project extensions concentrate on the content Schema, the Remark / Rehype pipeline, and explicit component APIs.

### Progressive enhancement

Article bodies, search indexes, and Mermaid SVGs can all be generated at build time. Task persistence, zoom and drag, comments, and page transitions build on top of static content; when an enhancement is unavailable, it should not block article reading.

## 4. Technical topics

The technical implementation is divided into seven articles by responsibility, covering four layers: engineering, content, visual, and interaction:

| Topic | Main content |
| :--- | :--- |
| [Project structure and static build](./project/architecture) | Repository directories, routing layout, content source, compilation pipeline, static export, site configuration, and MDX Preview |
| [Content pipeline and MDX enhancements](./project/content-engineering) | Frontmatter Schema, MDX components, code blocks, collapsible blocks, tasks, file hierarchies, document cards, Remark plugins, and client boundaries |
| [Design system and theme](./project/design-system) | Semantic tokens, Glass visual system, theme switching, motion tiers, and accessibility fallbacks |
| [Home page and immersive interactions](./project/home-and-immersive) | Home page visual composition, ambient animation, chapter cards, immersive particles, TOC scrollbar, and motion preferences |
| [Search, navigation, and community](./project/search-navigation) | Mixed Chinese-English and pinyin search, result enhancement, chapter scoping, reading return, source endpoints, i18n, and Giscus |
| [Route transition system](./project/transitions) | Five transition semantics, asymmetric behavior, DOM cloning, content particle transitions, and contain isolation |
| [Mermaid and performance](./project/mermaid-performance) | Build-time diagrams, zoom interactions, toolbar, performance strategies, and mobile fallbacks |

Operational constraints for contributors follow the [Contribution guide](./contributing); Markdown and MDX authoring conventions are collected in the [Syntax and component reference](./contributing/syntax-example).

## 5. Tech stack snapshot

Versions follow `package.json`:

| Category | Current choice |
| :--- | :--- |
| Framework | Next.js 16.3 (App Router + Turbopack) |
| Runtime | React 19.2 |
| Documentation engine | fumadocs-core / fumadocs-ui 16.14, fumadocs-mdx 15.2 |
| Language and types | TypeScript 6.0 (strict) |
| Styling | Tailwind CSS 4.3 + CSS variables |
| Search | Orama, zbsearch, `@orama/tokenizers` |
| Diagrams and formulas | Mermaid 11.16, KaTeX 0.18 |
| Code quality | Biome 2.5 |
| Package manager and scripts | Bun |
| Comments | Giscus + GitHub Discussions |

## 6. Openness

The project source code is hosted on [GitHub](https://github.com/SSJ-ZYJ/Neoverse-Doc). The code is licensed under the MIT License, and the documentation content is licensed under CC BY-NC-SA 4.0.

The README provides a repository-level feature overview, while this group of technical topics explains why these capabilities exist, how they combine, and what trade-offs they make under the static export boundary.