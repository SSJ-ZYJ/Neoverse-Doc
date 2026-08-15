import type { TaxonomyId } from './types';
import { defineTaxonomy, taxonomyIds } from './types';

export const CONTENT_TRACK_REGISTRY = defineTaxonomy([
  {
    id: 'computer-essentials',
    label: { zh: '计算机基础', en: 'Computer Essentials' },
    order: 10,
    description: {
      zh: '从日常计算机使用延伸到开发工具基础的学习路径。',
      en: 'A learning path from everyday computer use to development-tool fundamentals.',
    },
  },
] as const);

export const CONTENT_TRACK_IDS = taxonomyIds(CONTENT_TRACK_REGISTRY);

export type ContentTrack = TaxonomyId<typeof CONTENT_TRACK_REGISTRY>;
