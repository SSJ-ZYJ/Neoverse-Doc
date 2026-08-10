import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { create, insert, search } from 'zbsearch';
import {
  cleanSearchResultContent,
  mergePinyinSearchResults,
  preferSearchResultAnchors,
} from './search-client';
import {
  createMixedTokenizer,
  createPinyinSearchQuery,
  markPinyinIndexContent,
} from './search-tokenizer';

function createTestDB() {
  return create({
    schema: { content: 'string' },
    components: {
      tokenizer: createMixedTokenizer(),
    },
  });
}

async function assertPinyinMatch(query: string, content: string): Promise<void> {
  const db = createTestDB();
  await insert(db, { content: markPinyinIndexContent(content) });
  const pinyinQuery = createPinyinSearchQuery(query);
  assert.ok(pinyinQuery);

  const result = await search(db, {
    term: pinyinQuery,
    threshold: 0,
    tolerance: 0,
  });
  assert.equal(result.count, 1);
}

describe('Pinyin search tokenizer', () => {
  it('matches continuous, spaced, initial, and uppercase Pinyin queries', async () => {
    for (const query of ['wenjianguanli', 'wen jian guan li', 'wjgl', 'WJGL']) {
      await assertPinyinMatch(query, '文件管理');
    }
  });

  it('matches a continuous phrase inside a numbered heading', async () => {
    await assertPinyinMatch('wenjianchazhaoyusousuo', '五、文件查找与搜索');
  });

  it('uses contextual polyphone readings and accepts v/u for ü', async () => {
    for (const query of ['chongqing', 'yinhang', 'lvse', 'luse']) {
      await assertPinyinMatch(query, '重庆银行与绿色设置');
    }
  });

  it('does not create aliases outside the selected index scope', async () => {
    const db = createTestDB();
    await insert(db, { content: markPinyinIndexContent('文件管理') });
    await insert(db, { content: '正文内容' });

    const titleQuery = createPinyinSearchQuery('wenjianguanli');
    const bodyQuery = createPinyinSearchQuery('zhengwenneirong');
    assert.ok(titleQuery);
    assert.ok(bodyQuery);

    assert.equal((await search(db, { term: titleQuery, threshold: 0 })).count, 1);
    assert.equal((await search(db, { term: bodyQuery, threshold: 0 })).count, 0);
  });

  it('rejects one-letter, mixed Chinese/Pinyin, and tone-number fallbacks', () => {
    assert.equal(createPinyinSearchQuery('w'), undefined);
    assert.equal(createPinyinSearchQuery('wen件'), undefined);
    assert.equal(createPinyinSearchQuery('wen2jian4'), undefined);
  });
});

describe('Pinyin result merging', () => {
  it('removes index markers before rendering result content', () => {
    const results = [
      {
        id: 'page',
        url: '/docs/page',
        type: 'page' as const,
        content: markPinyinIndexContent('<mark>文件</mark>管理'),
      },
    ];

    assert.equal(cleanSearchResultContent(results)[0].content, '<mark>文件</mark>管理');
  });

  it('keeps literal ranking, removes duplicates, and excludes text results', () => {
    const literalResults = [
      { id: 'literal', url: '/literal', type: 'page' as const, content: 'Git' },
      { id: 'duplicate', url: '/duplicate', type: 'heading' as const, content: '工具' },
    ];
    const pinyinResults = [
      { id: 'duplicate', url: '/duplicate', type: 'heading' as const, content: '工具' },
      { id: 'body', url: '/body', type: 'text' as const, content: '正文' },
      { id: 'pinyin', url: '/pinyin', type: 'page' as const, content: '版本控制' },
    ];

    assert.deepEqual(
      mergePinyinSearchResults(literalResults, pinyinResults).map((result) => result.id),
      ['literal', 'duplicate', 'pinyin'],
    );
  });

  it('points each leading page result at its first matching section', () => {
    const results = [
      { id: 'page-a', url: '/docs/a', type: 'page' as const, content: 'Page A' },
      { id: 'text-a', url: '/docs/a#search', type: 'text' as const, content: 'Match' },
      { id: 'page-b', url: '/docs/b', type: 'page' as const, content: 'Page B' },
      { id: 'text-b', url: '/docs/b', type: 'text' as const, content: 'Introduction' },
    ];

    assert.deepEqual(
      preferSearchResultAnchors(results).map((result) => result.url),
      ['/docs/a#search', '/docs/a#search', '/docs/b', '/docs/b'],
    );
  });
});
