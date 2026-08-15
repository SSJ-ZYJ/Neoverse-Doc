import type { TaxonomyId } from './types';
import { defineTaxonomy, taxonomyIds } from './types';

export const CONTENT_DIFFICULTY_REGISTRY = defineTaxonomy([
  {
    id: 'beginner',
    label: { zh: '入门', en: 'Beginner' },
    order: 10,
    description: {
      zh: '面向没有相关前置知识的读者。',
      en: 'For readers without the relevant prior knowledge.',
    },
  },
  {
    id: 'intermediate',
    label: { zh: '进阶', en: 'Intermediate' },
    order: 20,
    description: {
      zh: '要求读者已掌握基础概念和常见操作。',
      en: 'Assumes foundational concepts and common operations are understood.',
    },
  },
  {
    id: 'advanced',
    label: { zh: '高级', en: 'Advanced' },
    order: 30,
    description: {
      zh: '面向需要综合运用既有知识的读者。',
      en: 'For readers who can synthesize existing knowledge.',
    },
  },
] as const);

export const CONTENT_DIFFICULTY_IDS = taxonomyIds(CONTENT_DIFFICULTY_REGISTRY);

export type Difficulty = TaxonomyId<typeof CONTENT_DIFFICULTY_REGISTRY>;
