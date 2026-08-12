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
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigationSnapshot } from '@/runtime/navigation/use-navigation';

const STORAGE_KEY = 'sidebar-collapsed';

interface SidebarProviderWrapperProps {
  defaultOpenLevel?: number;
  prefetch?: boolean;
  children?: React.ReactNode;
}

function SidebarStateSyncer() {
  const { collapsed, mode, setCollapsed, setOpen } = useSidebar();
  const navigation = useNavigationSnapshot();
  const initialized = useRef(false);

  useEffect(() => {
    if (mode !== 'drawer') return;

    // Fumadocs normally closes the drawer after pathname commits. Route intent
    // is available at click time, so start closing immediately instead.
    // Fumadocs 默认在 pathname 提交后才关闭抽屉；路由意图在点击时已经可用，
    // 因此立即开始收回侧栏。
    if (navigation.phase === 'capturing' || navigation.phase === 'leaving') setOpen(false);
  }, [mode, navigation.phase, setOpen]);

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
