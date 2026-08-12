import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getSelectedDocsSearchText,
  MAX_SELECTED_SEARCH_LENGTH,
  normalizeSelectedSearchText,
} from './selection';

function createEndpoint(editable = false): Node {
  return {
    nodeType: 3,
    parentElement: {
      closest: () => (editable ? {} : null),
    },
  } as unknown as Node;
}

function createSelection(text: string, startContainer: Node, endContainer: Node): Selection {
  return {
    isCollapsed: false,
    rangeCount: 1,
    getRangeAt: () => ({ startContainer, endContainer }) as Range,
    toString: () => text,
  } as unknown as Selection;
}

describe('Selected search text', () => {
  it('trims and collapses whitespace across document elements', () => {
    assert.equal(
      normalizeSelectedSearchText('  Windows\n\t file\u00a0  management  '),
      'Windows file management',
    );
  });

  it('preserves punctuation, case, numbers, and technical symbols', () => {
    const text = 'Path: C:\\Windows\\System32 — Ctrl+K / UTF-8';
    assert.equal(normalizeSelectedSearchText(text), text);
  });

  it('limits the query without splitting a Unicode code point', () => {
    const text = `${'中'.repeat(MAX_SELECTED_SEARCH_LENGTH - 1)}😀尾`;
    const normalized = normalizeSelectedSearchText(text);

    assert.equal(Array.from(normalized).length, MAX_SELECTED_SEARCH_LENGTH);
    assert.equal(normalized.endsWith('😀'), true);
  });

  it('accepts a selection whose endpoints stay inside the article', () => {
    const start = createEndpoint();
    const end = createEndpoint();
    const root = { contains: (node: Node) => node === start || node === end } as HTMLElement;

    assert.equal(
      getSelectedDocsSearchText(createSelection('  selected\ntext ', start, end), root),
      'selected text',
    );
  });

  it('rejects selections outside the article or inside an editable control', () => {
    const inside = createEndpoint();
    const outside = createEndpoint();
    const editable = createEndpoint(true);
    const root = { contains: (node: Node) => node !== outside } as HTMLElement;

    assert.equal(
      getSelectedDocsSearchText(createSelection('outside', inside, outside), root),
      undefined,
    );
    assert.equal(
      getSelectedDocsSearchText(createSelection('editable', editable, inside), root),
      undefined,
    );
  });
});
