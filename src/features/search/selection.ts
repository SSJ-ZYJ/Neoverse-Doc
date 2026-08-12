const EDITABLE_SELECTOR = 'input, textarea, [contenteditable]:not([contenteditable="false"])';

export const MAX_SELECTED_SEARCH_LENGTH = 200;

export function normalizeSelectedSearchText(text: string): string {
  return Array.from(text.trim().replace(/\s+/gu, ' '))
    .slice(0, MAX_SELECTED_SEARCH_LENGTH)
    .join('');
}

function getEndpointElement(node: Node): Element | null {
  return node.nodeType === 1 ? (node as Element) : node.parentElement;
}

function isEditableEndpoint(node: Node): boolean {
  return Boolean(getEndpointElement(node)?.closest(EDITABLE_SELECTOR));
}

export function getSelectedDocsSearchText(
  selection: Selection | null,
  root: HTMLElement | null,
): string | undefined {
  if (!selection || !root || selection.isCollapsed || selection.rangeCount === 0) return;

  for (let index = 0; index < selection.rangeCount; index++) {
    const range = selection.getRangeAt(index);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return;
    if (isEditableEndpoint(range.startContainer) || isEditableEndpoint(range.endContainer)) return;
  }

  return normalizeSelectedSearchText(selection.toString()) || undefined;
}
