// Static search dialog for SSG. Uses Orama static client with i18n locale support.
// Custom mixed tokenizer handles both Chinese (CJK segmentation) and English (case-insensitive).
// 静态搜索对话框（用于 SSG）。使用 Orama 静态客户端，支持 i18n 语言切换。
// 自定义混合分词器同时处理中文（CJK 分词）和英文（大小写不敏感）。
'use client';

import { create } from '@orama/orama';
import { useDocsSearch } from 'fumadocs-core/search/client';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { createMixedTokenizer } from '@/lib/search-tokenizer';

function initOrama(locale?: string) {
  if (locale === 'zh') {
    return create({
      schema: { _: 'string' },
      components: {
        tokenizer: createMixedTokenizer(),
      },
    });
  }

  return create({
    schema: { _: 'string' },
    language: 'english',
  });
}

export default function DefaultSearchDialog(props: SharedProps) {
  const { locale } = useI18n();
  const { search, setSearch, query } = useDocsSearch({
    type: 'static',
    initOrama,
    locale,
  });

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay className="!bg-transparent" />
      <SearchDialogContent>
        <SearchDialogHeader className="glass-edge">
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== 'empty' ? query.data : null} />
      </SearchDialogContent>
    </SearchDialog>
  );
}
