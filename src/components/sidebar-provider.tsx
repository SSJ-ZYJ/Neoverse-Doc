/**
 * Custom SidebarProvider wrapper with localStorage persistence for collapsed state.
 * Uses a two-phase approach: first read localStorage synchronously during initial render,
 * then sync state via useLayoutEffect to prevent visual flicker.
 * 自定义 SidebarProvider 包装器，支持折叠状态的 localStorage 持久化。
 * 使用两阶段方法：在初始渲染时同步读取 localStorage，
 * 然后通过 useLayoutEffect 同步状态，防止视觉闪烁。
 */
'use client';

import {
  SidebarProvider as FumadocsSidebarProvider,
  useSidebar,
} from 'fumadocs-ui/layouts/docs/slots/sidebar';
import { useLayoutEffect, useRef } from 'react';

const STORAGE_KEY = 'sidebar-collapsed';

interface SidebarProviderWrapperProps {
  defaultOpenLevel?: number;
  prefetch?: boolean;
  children?: React.ReactNode;
}

function SidebarStateSyncer() {
  const { collapsed, setCollapsed } = useSidebar();
  const initialized = useRef(false);

  useLayoutEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      setCollapsed(true);
    } else if (stored === 'false') {
      setCollapsed(false);
    }
  }, [setCollapsed]);

  useLayoutEffect(() => {
    if (!initialized.current) return;
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  return null;
}

export function SidebarProvider(props: SidebarProviderWrapperProps) {
  return (
    <FumadocsSidebarProvider {...props}>
      <SidebarStateSyncer />
      {props.children}
    </FumadocsSidebarProvider>
  );
}
