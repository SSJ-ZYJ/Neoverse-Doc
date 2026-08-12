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
import { CustomCodeBlock, LongCodeBlock } from '@/components/mdx/custom-codeblock';
import {
  DocCard,
  DocGrid,
  FeatureCard,
  LearningPath,
  ResourceLink,
} from '@/components/mdx/doc-cards';
import { File, Files, Folder } from '@/components/mdx/files';
import { Mermaid } from '@/features/mermaid';
import { MdxListItem } from '@/features/tasks';

const projectMdxComponents = {
  ...defaultMdxComponents,
  details: CollapsibleDetailsRenderer,
  // GFM task-list items become interactive while ordinary list items stay native.
  // GFM 任务列表项获得交互能力，普通列表项仍保持原生渲染。
  li: MdxListItem,
  Mermaid,
  pre: CustomCodeBlock,
  LongCodeBlock,
  Tabs,
  Tab,
  DocCard,
  DocGrid,
  FeatureCard,
  LearningPath,
  ResourceLink,
  // Fumadocs file hierarchy components replace character-drawn directory trees in documents.
  // Fumadocs 文件层级组件用于替代文档中以字符绘制的目录树。
  File,
  Files,
  Folder,
} satisfies MDXComponents;

export function getMdxComponents(overrides?: MDXComponents): MDXComponents {
  if (!overrides) return projectMdxComponents;

  return {
    ...projectMdxComponents,
    ...overrides,
  };
}
