---
title: Search & Indexing
description: Full-text search solution based on fumadocs-core static search API
---

Neoverse-Doc uses fumadocs-core's built-in static search solution, powered by the Orama search engine, providing full-text search without third-party services.

## Technical Solution

### Architecture Overview

```text
Build Time                              Runtime
   ↓                                       ↓
fumadocs-mdx compiles docs             User initiates search
   ↓                                       ↓
.source/ compiled output               /api/search GET request
   ↓                                       ↓
source.loader loads page tree         Frontend renders results
```

### Search API

```typescript
// src/app/api/search/route.ts
import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/lib/source';

export const dynamic = 'force-static';

const { staticGET } = createFromSource(source, {
  localeMap: {
    zh: 'english',
    en: 'english',
  },
});

export const GET = staticGET;
```

### Key Configuration

| Config | Description |
| :--- | :--- |
| `dynamic = 'force-static'` | Force static route, generate search index at build time |
| `localeMap` | Language to tokenizer mapping, `zh` falls back to `english` |
| `staticGET` | Pre-rendered GET handler, outputs static JSON index |

### Chinese Tokenization

Currently uses the `english` tokenizer for all languages (including Chinese). Chinese search supports exact match and prefix match. For better Chinese tokenization, consider adding `@orama/tokenizers/mandarin`.

## Enabling Search UI

Enable the search trigger in the docs layout:

```tsx
// src/app/[lang]/docs/layout.tsx
import { DocsLayout } from 'fumadocs-ui/layouts/docs';

export default function DocsLayoutPage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DocsLayout
      {...options}
      full={false}
    >
      {children}
    </DocsLayout>
  );
}
```

The search trigger is auto-rendered by fumadocs-ui on the right side of the navbar, accessible via `Cmd/Ctrl + K`.

## Static Export Adaptation

Since the project uses `output: 'export'` for static export, the search API route must declare `force-static`:

```typescript
export const dynamic = 'force-static';
```

This ensures the search index is generated to the `out/` directory at build time, deployable to any static hosting platform.

## Index Structure

The generated search index JSON contains:

- `documents`: Array of documents (title, description, path)
- `schema`: Index schema definition
- `index`: Compressed inverted index

The frontend fetches index data via `fetch('/api/search')` and implements real-time search with the Orama client.

> Search UI components and advanced filtering features coming soon.