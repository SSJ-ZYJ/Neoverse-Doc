// Hook: manages the Mermaid diagram view mode (rendered SVG vs. editable source).
// The preference is persisted to localStorage so the last-used view is restored
// across page refreshes and revisits. Reads are deferred to mount to avoid SSR
// hydration mismatches.
// 自定义 Hook：管理 Mermaid 图表视图模式（渲染 SVG 或可编辑源码）。
// 偏好持久化到 localStorage，刷新或重新访问时恢复上次使用的视图。
// 读取延迟到挂载后执行，避免 SSR 水合不一致。

'use client';

import { useCallback, useEffect, useState } from 'react';

export type MermaidViewMode = 'render' | 'code';

const STORAGE_KEY = 'nd-mermaid-view-mode';

function readStoredMode(): MermaidViewMode {
  if (typeof window === 'undefined') return 'render';
  return localStorage.getItem(STORAGE_KEY) === 'code' ? 'code' : 'render';
}

export function useMermaidViewMode() {
  // Default to 'render' during SSR and the first client paint; the stored
  // preference is applied immediately after mount.
  // SSR 和首帧客户端渲染时默认 'render'，存储的偏好在挂载后立即应用。
  const [viewMode, setViewMode] = useState<MermaidViewMode>('render');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setViewMode(readStoredMode());
    setHydrated(true);
  }, []);

  // Persist preference changes only after hydration to avoid overwriting the
  // stored value with the SSR default before the real preference is loaded.
  // 仅在 hydration 后持久化偏好变更，避免用 SSR 默认值覆盖真实偏好。
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode, hydrated]);

  const toggleViewMode = useCallback(() => {
    setViewMode((m) => (m === 'render' ? 'code' : 'render'));
  }, []);

  return { viewMode, setViewMode, toggleViewMode, hydrated };
}
