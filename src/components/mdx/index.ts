/**
 * Shared MDX component registry following the Fumadocs composition pattern.
 * The stable base object avoids rebuilding the same registry for every document render.
 *
 * 遵循 Fumadocs 组合模式的共享 MDX 组件注册表。
 * 稳定的基础对象避免每次文档渲染都重复构造相同注册表。
 */

import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { Tab, Tabs } from '@/components/mdx/code-tabs';
import { CollapsibleDetailsRenderer } from '@/components/mdx/collapsible-details-renderer';
import { CustomCodeBlock } from '@/components/mdx/custom-codeblock';
import {
  DocCard,
  DocGrid,
  FeatureCard,
  LearningPath,
  ResourceLink,
} from '@/components/mdx/doc-cards';
import { Mermaid } from '@/components/mdx/mermaid';

const projectMdxComponents = {
  ...defaultMdxComponents,
  details: CollapsibleDetailsRenderer,
  Mermaid,
  pre: CustomCodeBlock,
  Tabs,
  Tab,
  DocCard,
  DocGrid,
  FeatureCard,
  LearningPath,
  ResourceLink,
} satisfies MDXComponents;

export function getMdxComponents(overrides?: MDXComponents): MDXComponents {
  if (!overrides) return projectMdxComponents;

  return {
    ...projectMdxComponents,
    ...overrides,
  };
}
