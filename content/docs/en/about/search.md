---
title: Search & Indexing
description: Integrating fumadocs-core built-in search for static retrieval capabilities
---

fumadocs-core comes with a lightweight static search solution that requires no third-party services.

## Enablement Steps

1. Export `createFromSource(source)` in `src/app/api/search/route.ts` (requires disabling `output: 'export'` or switching to a static index file).
2. For static export scenarios, it is recommended to generate `search-index.json` at build time and implement client-side retrieval via `fetch + minisearch`.
3. Inject the `search` slot in fumadocs-ui's `RootProvider` or `DocsLayout` to trigger the search trigger.

## Static Export Strategy

```ts
// Pseudocode: Generate index at build time
import { generateSearchIndex } from 'fumadocs-core/search/server';

const index = await generateSearchIndex(source.getPages());
await fs.writeFile('public/search-index.json', JSON.stringify(index));
```

> This section will be supplemented with concrete examples as the project's index generator is implemented.
