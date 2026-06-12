// Doc page not-found fallback: handles missing MDX slugs from the catch-all route.
// 文档正文未找到回退：处理 catch-all 路由中缺失的 MDX slug。

import { LocalizedNotFound } from '@/components/localized-not-found';

export default function NotFound() {
  return <LocalizedNotFound variant="docs" />;
}
