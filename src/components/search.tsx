// Static search dialog for SSG with locale-aware tokenization and Pinyin fallback.
// Leading page results inherit the best matching section anchor when available.
// 用于 SSG 的静态搜索对话框，支持多语言分词与拼音回退。
// 每组首位文章结果会在可用时继承最相关的小节锚点。
'use client';

import { useDocsSearch } from 'fumadocs-core/search/client';
import { staticClient } from 'fumadocs-core/search/client/orama-static';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from 'fumadocs-ui/components/ui/popover';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import type { TagItem } from 'fumadocs-ui/contexts/search';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { create } from 'zbsearch';
import { getPageDictionary } from '@/dictionaries';
import { resolveLocale } from '@/lib/i18n';
import { withEnhancedSearch } from '@/lib/search-client';
import { createMixedTokenizer } from '@/lib/search-tokenizer';

interface DefaultSearchDialogProps extends SharedProps {
  defaultTag?: string;
  tags?: TagItem[];
}

function initDB(locale?: string) {
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

export default function DefaultSearchDialog({
  defaultTag,
  tags = [],
  ...props
}: DefaultSearchDialogProps) {
  const { locale } = useI18n();
  const [tag, setTag] = useState(defaultTag);
  const labels = getPageDictionary(resolveLocale(locale));
  const selectedScope = tags.find((scope) => scope.value === (tag ?? '')) ?? tags[0];

  // Reset the selected chapter when locale-aware dialog options change.
  // 当本地化弹窗选项变化时重置已选章节，避免语言切换后沿用无效标签。
  useEffect(() => {
    setTag(defaultTag);
  }, [defaultTag]);

  const searchClient = staticClient({
    initDB,
    locale,
    tag: tag || undefined,
  });
  const { search, setSearch, query } = useDocsSearch({
    client: withEnhancedSearch(searchClient, locale === 'zh'),
  });

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay className="!bg-transparent" />
      <SearchDialogContent>
        <SearchDialogHeader className="search-dialog__header">
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== 'empty' ? query.data : null} />
        {/* A lightweight trigger keeps chapter filtering secondary to search, while
            the themed popover remains scrollable and follows the light/dark tokens.
            轻量触发器让章节筛选保持次要层级，主题化 Popover 则支持滚动并跟随深浅色 Token。 */}
        {tags.length > 0 && (
          <SearchDialogFooter className="search-dialog__scope-footer">
            <span className="search-dialog__scope-label">{labels.searchScopeLabel}</span>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  aria-label={labels.searchScopeLabel}
                  className="search-dialog__scope-trigger"
                  data-filtered={tag ? 'true' : 'false'}
                  type="button"
                >
                  <span aria-hidden="true" className="search-dialog__scope-indicator" />
                  <span className="search-dialog__scope-value">{selectedScope?.name}</span>
                  <ChevronDown aria-hidden="true" className="search-dialog__scope-chevron" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                aria-label={labels.searchScopeLabel}
                className="search-dialog__scope-menu"
                role="listbox"
                sideOffset={6}
              >
                {tags.map((scope) => {
                  const selected = scope.value === (tag ?? '');

                  return (
                    <PopoverClose asChild key={scope.value}>
                      <button
                        aria-selected={selected}
                        className="search-dialog__scope-option"
                        onClick={() => setTag(scope.value)}
                        role="option"
                        type="button"
                      >
                        <span className="search-dialog__scope-check" aria-hidden="true">
                          {selected && <Check />}
                        </span>
                        <span>{scope.name}</span>
                      </button>
                    </PopoverClose>
                  );
                })}
              </PopoverContent>
            </Popover>
          </SearchDialogFooter>
        )}
      </SearchDialogContent>
    </SearchDialog>
  );
}
