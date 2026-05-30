// Locale-level not-found page: keeps fallback copy aligned with the active [lang] segment.
// 语言级未找到页面：根据当前 [lang] 段展示对应语言的回退文案。

import { LocalizedNotFound } from '@/components/localized-not-found';

export default function NotFound() {
  return <LocalizedNotFound />;
}
