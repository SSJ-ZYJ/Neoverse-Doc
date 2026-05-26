---
title: 搜索与索引
description: 基于 fumadocs-core 静态搜索 API 的全文检索方案
---

Neoverse-Doc 使用 fumadocs-core 内置的静态搜索方案，基于 Orama 搜索引擎，无需第三方服务即可实现全文检索。

## 技术方案

### 架构概览

```text
构建期                              运行期
   ↓                                  ↓
fumadocs-mdx 编译文档              用户发起搜索
   ↓                                  ↓
.source/ 编译产物                  /api/search GET 请求
   ↓                                  ↓
source.loader 加载页面树            前端渲染搜索结果
```

### 搜索 API

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

### 关键配置

| 配置项 | 说明 |
| :--- | :--- |
| `dynamic = 'force-static'` | 强制静态路由，构建期生成搜索索引 |
| `localeMap` | 语言到分词器的映射，当前 `zh` 回退到 `english` 分词 |
| `staticGET` | 预渲染的 GET 处理器，输出静态 JSON 索引 |

### 中文分词

当前使用 `english` 分词器处理所有语言（包含中文）。中文搜索支持精确匹配和前缀匹配。如需更强的中文分词效果，可引入 `@orama/tokenizers/mandarin`。

## 启用搜索 UI

在文档布局中启用搜索触发器：

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

搜索触发器由 fumadocs-ui 自动渲染，位于导航栏右侧，按 `Cmd/Ctrl + K` 可快速唤起。

## 静态导出适配

由于项目使用 `output: 'export'` 静态导出，搜索 API 路由需声明 `force-static`：

```typescript
export const dynamic = 'force-static';
```

这确保搜索索引在构建期生成到 `out/` 目录，可正常部署至任意静态托管平台。

## 索引结构

生成的搜索索引 JSON 包含：

- `documents`: 文档数组（标题、描述、路径）
- `schema`: 索引 schema 定义
- `index`: 压缩后的倒排索引

前端通过 `fetch('/api/search')` 获取索引数据，配合 Orama 客户端实现实时搜索。

> 搜索 UI 组件与高级过滤功能持续完善中。