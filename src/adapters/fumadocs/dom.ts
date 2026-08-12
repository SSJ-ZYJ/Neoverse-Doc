// Stable accessors isolate Fumadocs-owned DOM hooks from product features.
// 稳定访问器将 Fumadocs 所有的 DOM 钩子与产品功能隔离。

export const FUMADOCS_DOCS_PAGE_SELECTOR = '#nd-page';
export const FUMADOCS_DOCS_LAYOUT_SELECTOR = '#nd-docs-layout';
export const FUMADOCS_DOCS_TOC_SELECTOR = '#nd-toc';
export const FUMADOCS_SIDEBAR_SELECTOR = '#nd-sidebar';
export const FUMADOCS_MOBILE_SIDEBAR_SELECTOR = '#nd-sidebar-mobile';

export const FUMADOCS_TOP_CHROME_SELECTOR = [
  '#nd-nav',
  '#nd-subnav',
  '#nd-docs-layout header.border-b.backdrop-blur-sm',
  '[data-toc-popover]',
  '[data-toc-popover-trigger]',
].join(', ');

export const FUMADOCS_MOBILE_SIDEBAR_UTILITY_LINK_SELECTOR =
  '#nd-sidebar-mobile > div:first-child > div.flex > div:first-child > a';

export const FUMADOCS_SIDEBAR_DOCUMENT_GROUP_TRIGGER_SELECTOR =
  ':is(#nd-sidebar, #nd-sidebar-mobile) button[data-state][aria-expanded]:not([aria-haspopup])';

export const FUMADOCS_SIDEBAR_FOOTER_SELECTOR =
  '#nd-sidebar > div:has(> button[aria-haspopup="dialog"]):has(> div > button[data-theme-toggle])';

export const FUMADOCS_MOBILE_TITLE_SELECTOR =
  '#nd-docs-layout > div.sticky header.border-b.backdrop-blur-sm';

export const FUMADOCS_CODE_TABS_SELECTOR =
  '#nd-page div[data-orientation]:has(> [role="tablist"]):has(> [role="tabpanel"])';

export const FUMADOCS_CONTROL_SELECTOR = [
  '#nd-nav button',
  '#nd-sidebar button',
  '#nd-sidebar-mobile button',
  FUMADOCS_MOBILE_SIDEBAR_UTILITY_LINK_SELECTOR,
  '#nd-docs-layout header button',
  '#nd-docs-layout > div.fixed.flex button',
  '[data-toc-popover-trigger]',
].join(',');

export function getDocsPageElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>(FUMADOCS_DOCS_PAGE_SELECTOR);
}

export function getDocsContentSurfaceElement(): HTMLElement | null {
  return getDocsPageElement()?.firstElementChild as HTMLElement | null;
}

export function getDocsLayoutElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>(FUMADOCS_DOCS_LAYOUT_SELECTOR);
}

export function getDocsTocElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>(FUMADOCS_DOCS_TOC_SELECTOR);
}

export function getFumadocsTopChromeElements(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(FUMADOCS_TOP_CHROME_SELECTOR));
}
