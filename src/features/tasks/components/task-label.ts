import { isValidElement, type ReactNode } from 'react';

export function extractTaskText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTaskText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractTaskText(node.props.children);
  }
  return '';
}

export function normalizeTaskLabel(node: ReactNode, fallback: string): string {
  return extractTaskText(node).replace(/\s+/g, ' ').trim() || fallback;
}
