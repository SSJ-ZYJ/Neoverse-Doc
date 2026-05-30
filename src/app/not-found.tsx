// Root not-found page: falls back to the default locale when no [lang] segment exists.
// 根级未找到页面：当路径中没有 [lang] 段时回退到默认语言。

import { LocalizedNotFound } from '@/components/localized-not-found';

export default function NotFound() {
  return <LocalizedNotFound />;
}
