'use client';

import { createGlassRenderer } from '@neoverse-ui/glass-runtime';
import { useEffect } from 'react';

/**
 * Mounts the shared Neoverse glass edge renderer once for the document.
 * CSS remains authoritative, so unsupported or reduced-transparency clients
 * keep the tokenized fallback without a second Docs-specific renderer.
 *
 * 为整个文档挂载一次共享 Neoverse 玻璃边缘渲染器。CSS 仍是基础实现，
 * 因此不支持 WebGL 或启用减少透明度时会继续使用统一 Token 的降级样式。
 */
export function NeoverseGlassRuntime() {
  useEffect(() => {
    const renderer = createGlassRenderer();
    renderer.mount();

    return () => renderer.destroy();
  }, []);

  return null;
}
