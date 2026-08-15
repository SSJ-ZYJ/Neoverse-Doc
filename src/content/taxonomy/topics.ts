import type { TaxonomyId } from './types';
import { defineTaxonomy, taxonomyIds } from './types';

export const CONTENT_TOPIC_REGISTRY = defineTaxonomy([
  {
    id: 'architecture',
    label: { zh: '架构', en: 'Architecture' },
    order: 10,
    description: {
      zh: '软件系统的结构、职责与边界。',
      en: 'The structure, responsibilities, and boundaries of a software system.',
    },
  },
  {
    id: 'operating-system',
    label: { zh: '操作系统', en: 'Operating System' },
    order: 20,
    description: {
      zh: '计算机硬件与软件资源的管理系统。',
      en: 'Systems that manage computer hardware and software resources.',
    },
  },
  {
    id: 'shell',
    label: { zh: 'Shell', en: 'Shell' },
    order: 30,
    description: {
      zh: '用于解析和执行命令的命令解释器。',
      en: 'Command interpreters that parse and execute commands.',
    },
  },
  {
    id: 'terminal',
    label: { zh: '终端', en: 'Terminal' },
    order: 40,
    description: {
      zh: '与命令行程序交互的文本界面。',
      en: 'Text interfaces used to interact with command-line programs.',
    },
  },
  {
    id: 'text-editing',
    label: { zh: '文本编辑', en: 'Text Editing' },
    order: 50,
    description: {
      zh: '创建、修改与维护文本内容的工具和方法。',
      en: 'Tools and practices for creating, changing, and maintaining text.',
    },
  },
] as const);

export const CONTENT_TOPIC_IDS = taxonomyIds(CONTENT_TOPIC_REGISTRY);

export type ContentTopic = TaxonomyId<typeof CONTENT_TOPIC_REGISTRY>;
