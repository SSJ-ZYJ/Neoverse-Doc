---
title: Search and Indexing
description: Integrate fumadocs-core's built-in search to deliver static retrieval
---

fumadocs-core ships a lightweight static search solution that requires no third-party service.

## Enabling Search

1. Export `createFromSource(source)` from `src/app/api/search/route.ts` (you need to either disable `output: 'export'` or fall back to a static index file).
2. For static-export scenarios, build a `search-index.json` at build time and have the client perform retrieval through `fetch + minisearch`.
3. Inject the `search` slot into fumadocs-ui's `RootProvider` or `DocsLayout` to wire up the trigger.

## Static Export Strategy

```ts
// Pseudocode: generate the index at build time
import { generateSearchIndex } from 'fumadocs-core/search/server';

const index = await generateSearchIndex(source.getPages());
await fs.writeFile('public/search-index.json', JSON.stringify(index));
```

> This chapter will be expanded with concrete examples once the project lands a real index generator.
