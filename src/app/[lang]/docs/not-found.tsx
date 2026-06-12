// Docs not-found page: renders the fallback inside Fumadocs' main grid area.
// 文档区未找到页面：将回退内容渲染到 Fumadocs 的 main 网格区域内。

import { LocalizedNotFound } from '@/components/localized-not-found';

export default function NotFound() {
  return <LocalizedNotFound variant="docs" />;
}
