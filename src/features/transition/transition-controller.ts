// DOM clone, sanitization, activation, and geometry helpers for transitions.
// 转场使用的 DOM 克隆、清理、激活判断与几何计算工具。

import { getDocsLayoutElement } from '@/adapters/fumadocs/dom';
import type { TransitionOrigin } from './transition-types';

const UNSAFE_CLONE_SELECTOR =
  'canvas, video, audio, iframe, script, object, embed, .immersive-particle-layer';
const INTERACTIVE_SELECTOR =
  'a, button, input, textarea, select, summary, [tabindex], [contenteditable]';
const TRANSITION_SOURCE_ID_ATTRIBUTE = 'data-nd-transition-source-id';

// Preserve style hooks before removing duplicate IDs from the inert snapshot.
// 在不可交互快照中移除重复 ID 前，先保留对应的样式钩子。
function replaceIdWithTransitionStyleHook(node: HTMLElement): void {
  if (!node.id) return;
  node.setAttribute(TRANSITION_SOURCE_ID_ATTRIBUTE, node.id);
  node.removeAttribute('id');
}

function findSourceNode(): HTMLElement | null {
  const docsLayout = getDocsLayoutElement();
  if (docsLayout) return docsLayout;
  return document.querySelector<HTMLElement>('main:not(#nd-transition-layer main)');
}

export function cloneTransitionSource(): HTMLElement | null {
  const source = findSourceNode();
  if (!source) return null;

  const viewport = document.createElement('div');
  viewport.className = 'nd-transition-clone';
  viewport.style.width = `${document.documentElement.clientWidth || window.innerWidth}px`;

  const clone = source.cloneNode(true) as HTMLElement;
  replaceIdWithTransitionStyleHook(clone);
  clone.querySelectorAll<HTMLElement>('[id]').forEach((node) => {
    replaceIdWithTransitionStyleHook(node);
  });
  clone.querySelectorAll(UNSAFE_CLONE_SELECTOR).forEach((node) => {
    node.remove();
  });
  clone.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR).forEach((node) => {
    node.tabIndex = -1;
    node.removeAttribute('contenteditable');
  });
  clone.inert = true;
  clone.setAttribute('aria-hidden', 'true');

  if (window.scrollY > 0) clone.style.transform = `translateY(${-window.scrollY}px)`;
  viewport.appendChild(clone);
  return viewport;
}

export function calculateRevealRadius(origin: TransitionOrigin): number {
  return Math.max(
    Math.hypot(origin.x, origin.y),
    Math.hypot(window.innerWidth - origin.x, origin.y),
    Math.hypot(origin.x, window.innerHeight - origin.y),
    Math.hypot(window.innerWidth - origin.x, window.innerHeight - origin.y),
  );
}

export function resolveEventOrigin(event: MouseEvent, anchor: HTMLAnchorElement): TransitionOrigin {
  if (event.clientX !== 0 || event.clientY !== 0) return { x: event.clientX, y: event.clientY };
  const rect = anchor.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
