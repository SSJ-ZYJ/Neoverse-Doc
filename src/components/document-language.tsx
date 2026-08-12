'use client';

// Keeps <html lang> in sync with the active locale. Server-rendered documents
// carry i18n.defaultLanguage; after hydration — and on every locale switch that
// keeps the root layout mounted — this effect restores the correct language
// before assistive tools read the page. A raw <script> here would be skipped by
// React on the client, so a DOM effect is used instead.
// 与当前 locale 同步 <html lang>。服务端输出为 i18n.defaultLanguage；
// 水合完成以及每次语言切换（根布局保持挂载）后，此副作用都会在辅助工具
// 读取页面前修正文档语言。直接渲染 <script> 会在客户端被 React 跳过，
// 因此改用 DOM 副作用实现。

import { useEffect } from 'react';

export function DocumentLanguageSetter({ value }: { value: string }) {
  useEffect(() => {
    document.documentElement.lang = value;
  }, [value]);

  return null;
}
