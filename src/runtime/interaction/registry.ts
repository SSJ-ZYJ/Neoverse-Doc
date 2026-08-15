// Interaction registry: the runtime's single target-resolution entry.
// Neoverse-owned components declare capability through the data-nd-interaction
// contract; Fumadocs-owned DOM and pipeline-generated reading surfaces are
// translated here through the adapter layer, so no other runtime module
// learns third-party structure.
// 交互注册表：运行时唯一的目标解析入口。Neoverse 自有组件通过
// data-nd-interaction 契约声明交互能力；Fumadocs 自有 DOM 与管线生成的
// 阅读表面在此经适配层翻译，运行时其余模块不感知第三方结构。

import {
  FUMADOCS_CODE_TABS_SELECTOR,
  FUMADOCS_CONTROL_SELECTOR,
  FUMADOCS_DOCS_PAGE_SELECTOR,
  FUMADOCS_MOBILE_TITLE_SELECTOR,
  FUMADOCS_SIDEBAR_DOCUMENT_GROUP_TRIGGER_SELECTOR,
  FUMADOCS_SIDEBAR_FOOTER_SELECTOR,
} from '@/adapters/fumadocs/dom';
import type { GeometryMode, InteractionKind, ResolvedInteractionTarget } from './types';

export const INTERACTION_CONTRACT_ATTRIBUTE = 'data-nd-interaction';

const CONTRACT_SELECTOR = `[${INTERACTION_CONTRACT_ATTRIBUTE}]`;
const CONTRACT_KINDS: readonly InteractionKind[] = ['control', 'surface', 'cta'];

// Fumadocs shared-surface hosts resolved before the generic chain so one
// click produces a coherent full-surface field even when it starts on a
// nested control.
// Fumadocs 共享表面宿主优先于通用链解析，使点击即使落在内部控件上，
// 也由整个表面承载粒子。
const ADAPTER_SURFACE_HOSTS = [
  // The visible sidebar footer is an inset ::before glass bar.
  // 侧栏页脚的可见表面是内缩 ::before 玻璃条。
  {
    geometryMode: 'inset-before',
    kind: 'surface',
    selector: FUMADOCS_SIDEBAR_FOOTER_SELECTOR,
  },
  { geometryMode: 'box', kind: 'surface', selector: FUMADOCS_CODE_TABS_SELECTOR },
  { geometryMode: 'box', kind: 'surface', selector: FUMADOCS_MOBILE_TITLE_SELECTOR },
] as const satisfies ReadonlyArray<{
  geometryMode: GeometryMode;
  kind: InteractionKind;
  selector: string;
}>;

// Docs reading surfaces produced by Markdown/Fumadocs pipelines that cannot
// carry the contract attribute: plain blockquotes and table scroll wrappers.
// 由 Markdown/Fumadocs 管线生成、无法携带契约属性的文档阅读表面：
// 普通引用块与表格滚动包装器。
const ADAPTER_SURFACE_SELECTOR = [
  `:where(${FUMADOCS_DOCS_PAGE_SELECTOR}) blockquote`,
  `:where(${FUMADOCS_DOCS_PAGE_SELECTOR}) :where(.prose-no-margin):has(> table)`,
].join(',');

// Fumadocs chrome controls plus role-based dialog/popper buttons; the latter
// stay generic (ARIA roles) instead of naming specific components.
// Fumadocs 框架控件与基于角色的对话框/弹层按钮；后者保持通用 ARIA 角色，
// 不点名具体组件。
const ADAPTER_CONTROL_SELECTOR = [
  FUMADOCS_CONTROL_SELECTOR,
  '[role="dialog"] button',
  '[data-radix-popper-content-wrapper] button',
].join(',');

const ADAPTER_FALLBACK_SELECTOR = `${ADAPTER_SURFACE_SELECTOR},${ADAPTER_CONTROL_SELECTOR}`;

function parseContractKind(value: string | null): InteractionKind | null {
  if (!value) return null;
  const kind = value.trim() as InteractionKind;
  return CONTRACT_KINDS.includes(kind) ? kind : null;
}

function qualify(
  target: HTMLElement,
  kind: InteractionKind,
  geometryMode: GeometryMode,
): ResolvedInteractionTarget | null {
  if (target.matches(':disabled, [aria-disabled="true"]')) return null;
  // Sidebar document groups are frequent navigation controls rather than
  // immersive action surfaces, so they keep native disclosure interactions.
  // 侧栏文档组属于高频导航控件，不参与沉浸式粒子反馈并保留原生展开交互。
  if (target.matches(FUMADOCS_SIDEBAR_DOCUMENT_GROUP_TRIGGER_SELECTOR)) return null;
  return { geometryMode, kind, target };
}

export function resolveInteractionTarget(source: Element | null): ResolvedInteractionTarget | null {
  for (const host of ADAPTER_SURFACE_HOSTS) {
    const hostTarget = source?.closest<HTMLElement>(host.selector);
    if (hostTarget) return qualify(hostTarget, host.kind, host.geometryMode);
  }

  const contractTarget = source?.closest<HTMLElement>(CONTRACT_SELECTOR);
  if (contractTarget) {
    const kind = parseContractKind(contractTarget.getAttribute(INTERACTION_CONTRACT_ATTRIBUTE));
    if (kind) return qualify(contractTarget, kind, 'box');
  }

  const adapterTarget = source?.closest<HTMLElement>(ADAPTER_FALLBACK_SELECTOR);
  if (adapterTarget) {
    const kind: InteractionKind = adapterTarget.matches(ADAPTER_SURFACE_SELECTOR)
      ? 'surface'
      : 'control';
    return qualify(adapterTarget, kind, 'box');
  }

  return null;
}
