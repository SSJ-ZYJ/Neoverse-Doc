/**
 * AI-aware collapsible details renderer.
 * It preserves the native `<details>` behavior and adds adaptive typewriter reveal only for AI blocks.
 *
 * 支持 AI 折叠块的详情渲染器。
 * 保留原生 `<details>` 行为，并且只为 AI 折叠块增加自适应打字机揭示效果。
 */

'use client';

import {
  Children,
  type ComponentProps,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';

const AI_DETAILS_CLASS = 'markdown-details-ai';
const AI_DETAILS_BODY_CLASS = 'markdown-details-ai-body';
const AI_TYPED_CHUNK_CLASS = 'markdown-details-ai-typed-chunk';

const AI_TYPEWRITER_SMALL_CHUNK_SIZE = 2;
const AI_TYPEWRITER_MEDIUM_CHUNK_SIZE = 4;
const AI_TYPEWRITER_LARGE_CHUNK_SIZE = 7;
const AI_TYPEWRITER_MEDIUM_TEXT_LENGTH = 360;
const AI_TYPEWRITER_LARGE_TEXT_LENGTH = 900;
const AI_TYPEWRITER_BASE_INTERVAL_MS = 120;
const AI_TYPEWRITER_MIN_INTERVAL_MS = 28;
const AI_TYPEWRITER_MAX_INTERVAL_MS = 150;
const AI_TYPEWRITER_MIN_DURATION_MS = 1800;
const AI_TYPEWRITER_MAX_DURATION_MS = 14000;

interface TypedRenderState {
  chunkIndex: number;
}

interface TypableElementProps {
  children?: ReactNode;
  className?: string;
}

export function CollapsibleDetails(props: ComponentProps<'details'>) {
  const { children, className, open, onToggle, ...rest } = props;
  const isAiDetails = hasClassName(className, AI_DETAILS_CLASS);
  const childrenArray = useMemo(() => Children.toArray(children), [children]);
  const summaryIndex = childrenArray.findIndex(isSummaryElement);
  const summaryNode = summaryIndex >= 0 ? childrenArray[summaryIndex] : null;
  const bodyNodes = useMemo(
    () => childrenArray.filter((_, index) => index !== summaryIndex),
    [childrenArray, summaryIndex],
  );
  const bodyCharacterCount = useMemo(
    () => (isAiDetails ? countTypableCharacters(bodyNodes) : 0),
    [bodyNodes, isAiDetails],
  );
  const chunkSize = getAdaptiveChunkSize(bodyCharacterCount);
  const chunkCount = Math.ceil(bodyCharacterCount / chunkSize);
  const [isOpen, setIsOpen] = useState(Boolean(open));
  const [visibleChunks, setVisibleChunks] = useState(chunkCount);
  const [animationRunId, setAnimationRunId] = useState(0);

  useEffect(() => {
    if (typeof open === 'boolean') {
      setIsOpen(open);
    }
  }, [open]);

  useEffect(() => {
    if (animationRunId === 0) {
      setVisibleChunks(chunkCount);
    }
  }, [animationRunId, chunkCount]);

  useEffect(() => {
    if (!isAiDetails || !isOpen || animationRunId === 0 || chunkCount === 0) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisibleChunks(chunkCount);
      return;
    }

    setVisibleChunks(0);
    const interval = window.setInterval(() => {
      setVisibleChunks((current) => {
        const next = Math.min(current + 1, chunkCount);
        if (next >= chunkCount) window.clearInterval(interval);
        return next;
      });
    }, getAdaptiveInterval(chunkCount));

    return () => window.clearInterval(interval);
  }, [animationRunId, chunkCount, isAiDetails, isOpen]);

  const animatedBody = useMemo(() => {
    if (!isAiDetails) return bodyNodes;
    return renderTypedNodes(bodyNodes, visibleChunks, chunkSize);
  }, [bodyNodes, chunkSize, isAiDetails, visibleChunks]);

  const handleToggle: ComponentProps<'details'>['onToggle'] = (event) => {
    const nextOpen = event.currentTarget.open;
    setIsOpen(nextOpen);

    if (isAiDetails && nextOpen) {
      setVisibleChunks(0);
      setAnimationRunId((current) => current + 1);
    }

    onToggle?.(event);
  };

  if (!isAiDetails) {
    return (
      <details className={className} open={open} onToggle={onToggle} {...rest}>
        {children}
      </details>
    );
  }

  return (
    <details
      className={className}
      data-ai-typing={
        isOpen && animationRunId > 0 && visibleChunks < chunkCount ? 'true' : undefined
      }
      open={isOpen}
      onToggle={handleToggle}
      {...rest}
    >
      {summaryNode}
      <div className={AI_DETAILS_BODY_CLASS}>{animatedBody}</div>
    </details>
  );
}

function hasClassName(className: unknown, targetClassName: string) {
  return typeof className === 'string' && className.split(/\s+/).includes(targetClassName);
}

function isSummaryElement(node: ReactNode) {
  return isValidElement(node) && node.type === 'summary';
}

function getAdaptiveChunkSize(characterCount: number) {
  if (characterCount >= AI_TYPEWRITER_LARGE_TEXT_LENGTH) return AI_TYPEWRITER_LARGE_CHUNK_SIZE;
  if (characterCount >= AI_TYPEWRITER_MEDIUM_TEXT_LENGTH) return AI_TYPEWRITER_MEDIUM_CHUNK_SIZE;
  return AI_TYPEWRITER_SMALL_CHUNK_SIZE;
}

function getAdaptiveInterval(chunkCount: number) {
  const desiredDuration = clamp(
    chunkCount * AI_TYPEWRITER_BASE_INTERVAL_MS,
    AI_TYPEWRITER_MIN_DURATION_MS,
    AI_TYPEWRITER_MAX_DURATION_MS,
  );

  return clamp(
    Math.round(desiredDuration / Math.max(chunkCount, 1)),
    AI_TYPEWRITER_MIN_INTERVAL_MS,
    AI_TYPEWRITER_MAX_INTERVAL_MS,
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function countTypableCharacters(nodes: ReactNode): number {
  if (typeof nodes === 'string' || typeof nodes === 'number') {
    const text = String(nodes);
    return text.trim() ? Array.from(text).length : 0;
  }

  if (!nodes || typeof nodes === 'boolean') return 0;

  if (Array.isArray(nodes)) {
    return nodes.reduce((total, node) => total + countTypableCharacters(node), 0);
  }

  if (!isValidElement<TypableElementProps>(nodes)) return 0;
  if (shouldSkipTyping(nodes)) return 0;

  return countTypableCharacters(nodes.props.children);
}

function shouldSkipTyping(element: ReactElement<TypableElementProps>) {
  if (typeof element.type === 'string') {
    return ['script', 'style', 'svg'].includes(element.type);
  }

  return (
    typeof element.type === 'function' &&
    'name' in element.type &&
    element.type.name === 'CustomCodeBlock'
  );
}

function renderTypedNodes(nodes: ReactNode, visibleChunks: number, chunkSize: number) {
  const state: TypedRenderState = { chunkIndex: 0 };
  return Children.map(nodes, (node) => renderTypedNode(node, visibleChunks, chunkSize, state));
}

function renderTypedNode(
  node: ReactNode,
  visibleChunks: number,
  chunkSize: number,
  state: TypedRenderState,
): ReactNode {
  if (typeof node === 'string' || typeof node === 'number') {
    return renderTypedText(String(node), visibleChunks, chunkSize, state);
  }

  if (!node || typeof node === 'boolean') return node;

  if (Array.isArray(node)) {
    return node.map((child) => renderTypedNode(child, visibleChunks, chunkSize, state));
  }

  if (!isValidElement<TypableElementProps>(node) || shouldSkipTyping(node)) return node;

  return cloneElement(
    node,
    undefined,
    renderTypedNode(node.props.children, visibleChunks, chunkSize, state),
  );
}

function renderTypedText(
  text: string,
  visibleChunks: number,
  chunkSize: number,
  state: TypedRenderState,
) {
  if (!text.trim()) return text;

  const characters = Array.from(text);
  const chunks: ReactNode[] = [];

  for (let index = 0; index < characters.length; index += chunkSize) {
    const chunk = characters.slice(index, index + chunkSize).join('');
    const chunkIndex = state.chunkIndex;
    state.chunkIndex += 1;

    chunks.push(
      <span
        className={AI_TYPED_CHUNK_CLASS}
        data-ai-caret={visibleChunks > 0 && chunkIndex === visibleChunks - 1 ? 'true' : undefined}
        data-ai-visible={chunkIndex < visibleChunks ? 'true' : undefined}
        key={`${chunkIndex}-${chunk}`}
      >
        {chunk}
      </span>,
    );
  }

  return chunks;
}
