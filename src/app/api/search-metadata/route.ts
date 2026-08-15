import { searchMetadataSidecar } from '@/content/search';

// Static metadata sidecar for future taxonomy-aware Search UI. The current
// dialog keeps its existing Chapter scope and does not fetch this endpoint yet.
// 供未来 taxonomy 感知 Search UI 使用的静态元数据 Sidecar。当前弹窗保留既有
// Chapter 范围，暂不请求该端点。
export const dynamic = 'force-static';

export function GET() {
  return Response.json(searchMetadataSidecar);
}
