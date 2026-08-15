import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSearchFilterTags, getSearchMetadataTags } from './facets';
import { createSearchCorpus, toFumadocsSearchIndexInput } from './schema';

const metadata = {
  searchPageId: 'docs:search/sample:zh',
  contentId: 'docs:search/sample',
  locale: 'zh' as const,
  chapterScope: 'ch1',
  contentType: 'guide' as const,
  topics: ['shell', 'terminal'] as const,
  tracks: ['computer-essentials'] as const,
  difficulty: 'beginner' as const,
};

describe('Search Schema v2', () => {
  it('joins structured body records to stable metadata without adding body to the sidecar', () => {
    const corpus = createSearchCorpus(
      {
        contentId: 'docs:search/sample',
        locale: 'zh',
        url: '/zh/docs/ch1/sample',
        title: '示例页面',
        description: '页面描述',
        structuredData: {
          headings: [{ id: 'intro', content: '简介' }],
          contents: [
            { heading: 'intro', content: '正文段落' },
            { heading: undefined, content: '未归属段落' },
          ],
        },
      },
      metadata,
    );

    assert.deepEqual(
      corpus.documents.map((document) => ({
        id: document.id,
        recordKind: document.recordKind,
        contentId: document.contentId,
        headingId: document.headingId,
        headingTitle: document.headingTitle,
        body: document.body,
      })),
      [
        {
          id: 'docs:search/sample:zh',
          recordKind: 'page',
          contentId: 'docs:search/sample',
          headingId: undefined,
          headingTitle: undefined,
          body: '示例页面',
        },
        {
          id: 'docs:search/sample:zh-0',
          recordKind: 'description',
          contentId: 'docs:search/sample',
          headingId: undefined,
          headingTitle: undefined,
          body: '页面描述',
        },
        {
          id: 'docs:search/sample:zh-1',
          recordKind: 'heading',
          contentId: 'docs:search/sample',
          headingId: 'intro',
          headingTitle: '简介',
          body: '简介',
        },
        {
          id: 'docs:search/sample:zh-2',
          recordKind: 'body',
          contentId: 'docs:search/sample',
          headingId: 'intro',
          headingTitle: '简介',
          body: '正文段落',
        },
        {
          id: 'docs:search/sample:zh-3',
          recordKind: 'body',
          contentId: 'docs:search/sample',
          headingId: undefined,
          headingTitle: undefined,
          body: '未归属段落',
        },
      ],
    );
    assert.deepEqual(toFumadocsSearchIndexInput(corpus), {
      id: 'docs:search/sample:zh',
      title: '示例页面',
      description: '页面描述',
      url: '/zh/docs/ch1/sample',
      structuredData: {
        headings: [{ id: 'intro', content: '简介' }],
        contents: [
          { heading: 'intro', content: '正文段落' },
          { heading: undefined, content: '未归属段落' },
        ],
      },
    });
  });

  it('uses native tags for Chapter compatibility and taxonomy filters', () => {
    assert.deepEqual(getSearchMetadataTags(metadata), [
      'ch1',
      'content-type:guide',
      'difficulty:beginner',
      'topic:shell',
      'topic:terminal',
      'track:computer-essentials',
    ]);
    assert.deepEqual(
      createSearchFilterTags({
        chapter: 'ch1',
        contentTypes: ['guide'],
        topics: ['shell'],
        tracks: ['computer-essentials'],
      }),
      ['ch1', 'content-type:guide', 'topic:shell', 'track:computer-essentials'],
    );
  });
});
