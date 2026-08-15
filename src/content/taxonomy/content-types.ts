import type { TaxonomyId } from './types';
import { defineTaxonomy, taxonomyIds } from './types';

export const CONTENT_TYPE_REGISTRY = defineTaxonomy([
  {
    id: 'concept',
    label: { zh: '概念', en: 'Concept' },
    order: 10,
    description: {
      zh: '解释核心术语、原理或模型的内容。',
      en: 'Content that explains a core term, principle, or model.',
    },
  },
  {
    id: 'guide',
    label: { zh: '指南', en: 'Guide' },
    order: 20,
    description: {
      zh: '围绕实践步骤、操作或学习过程组织的内容。',
      en: 'Content organized around practical steps, operations, or learning.',
    },
  },
  {
    id: 'reference',
    label: { zh: '参考', en: 'Reference' },
    order: 30,
    description: {
      zh: '供查阅项目约定、接口或事实的内容。',
      en: 'Content for looking up project conventions, interfaces, or facts.',
    },
  },
] as const);

export const CONTENT_TYPE_IDS = taxonomyIds(CONTENT_TYPE_REGISTRY);

export type ContentType = TaxonomyId<typeof CONTENT_TYPE_REGISTRY>;
