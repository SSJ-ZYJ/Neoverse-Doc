---
title: 搜索与索引
description: 接入 fumadocs-core 内建搜索，构建静态化检索能力
---

fumadocs-core 自带轻量级静态搜索方案，无需第三方服务。

## 启用步骤

1. 在 `src/app/api/search/route.ts` 中导出 `createFromSource(source)`（需关闭 `output: 'export'` 或改用静态索引文件）。
2. 静态导出场景下，建议改为构建期生成 `search-index.json`，前端通过 `fetch + minisearch` 实现客户端检索。
3. 在 fumadocs-ui 的 `RootProvider` 或 `DocsLayout` 中注入 `search` 槽以触发触发器。

## 静态导出策略

```ts
// 伪代码：build 期生成索引
import { generateSearchIndex } from 'fumadocs-core/search/server';

const index = await generateSearchIndex(source.getPages());
await fs.writeFile('public/search-index.json', JSON.stringify(index));
```

> 该章节会随项目落地的实际索引生成器同步补充实例。
