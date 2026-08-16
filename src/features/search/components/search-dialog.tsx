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
import { Check, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { create } from 'zbsearch';
import { getDocsPageElement } from '@/adapters/fumadocs/dom';
import {
  createSearchFacetTag,
  getSearchFacetDefinitions,
  parseSearchTag,
  type SearchFacetKey,
  type SearchFacetSelection,
} from '@/content/search/facets';
import { createMixedTokenizer } from '@/content/search/tokenizer';
import { getPageDictionary } from '@/dictionaries';
import { resolveLocale } from '@/lib/i18n';
import { withEnhancedSearch } from '../client';
import { SEARCH_QUERY_PARAM, SEARCH_TAG_PARAM } from '../search-intent';
import { getSelectedDocsSearchText } from '../selection';

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
  open,
  onOpenChange,
  tags = [],
  ...props
}: DefaultSearchDialogProps) {
  const { locale } = useI18n();
  const [chapter, setChapter] = useState(() => parseSearchTag(defaultTag).chapter);
  const [facets, setFacets] = useState<SearchFacetSelection>(
    () => parseSearchTag(defaultTag).facets,
  );
  const resolvedLocale = resolveLocale(locale);
  const labels = getPageDictionary(resolvedLocale);
  const facetDefinitions = useMemo(
    () => getSearchFacetDefinitions(resolvedLocale),
    [resolvedLocale],
  );
  const activeTags = useMemo(
    () => [
      ...(chapter ? [chapter] : []),
      ...facetDefinitions.flatMap((facet) => {
        const value = facets[facet.id];
        return value ? [createSearchFacetTag(facet.id, value)] : [];
      }),
    ],
    [chapter, facetDefinitions, facets],
  );
  const activeFacetCount = Object.keys(facets).length;
  const selectedScope = tags.find((scope) => scope.value === (chapter ?? '')) ?? tags[0];

  const updateFacet = (facetId: SearchFacetKey, value: string | undefined) => {
    setFacets((current) => {
      const next = { ...current };
      if (value === undefined) delete next[facetId];
      else next[facetId] = value;
      return next;
    });
  };

  // Reset the Chapter scope and taxonomy selections when locale-aware dialog
  // options change, avoiding stale filters after a language switch.
  // 当本地化弹窗选项变化时重置 Chapter 范围与分类选择，避免语言切换后沿用无效筛选。
  useEffect(() => {
    const parsed = parseSearchTag(defaultTag);
    setChapter(parsed.chapter);
    setFacets(parsed.facets);
  }, [defaultTag]);

  const searchClient = staticClient({
    initDB,
    locale,
    tag: activeTags.length > 0 ? activeTags : undefined,
  });
  const { search, setSearch, query } = useDocsSearch({
    client: withEnhancedSearch(searchClient, locale === 'zh'),
  });

  // Topic and Reference pages seed this existing Fumadocs search dialog with
  // a taxonomy tag and optional query; the search engine itself remains shared.
  // Topics 与 Reference 页面通过参数复用现有 Fumadocs 搜索弹窗的 taxonomy
  // 标签与查询词，搜索引擎本身仍保持单一实现。
  useEffect(() => {
    if (!open) return;

    const url = new URL(window.location.href);
    const intentQuery = url.searchParams.get(SEARCH_QUERY_PARAM);
    const intentTag = url.searchParams.get(SEARCH_TAG_PARAM);
    if (intentQuery === null && intentTag === null) return;

    if (intentTag !== null) {
      const parsed = parseSearchTag(intentTag);
      setChapter(parsed.chapter);
      setFacets(parsed.facets);
    }
    if (intentQuery !== null) setSearch(intentQuery);
    url.searchParams.delete(SEARCH_QUERY_PARAM);
    url.searchParams.delete(SEARCH_TAG_PARAM);
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [open, setSearch]);

  // Capture the built-in shortcut before Fumadocs opens and focuses the dialog,
  // otherwise the document selection may collapse before it can seed the query.
  // 在 Fumadocs 打开并聚焦弹窗前捕获内置快捷键，避免正文选区先因焦点切换而收起。
  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if (open || event.key !== 'k' || (!event.ctrlKey && !event.metaKey)) return;

      const selectedText = getSelectedDocsSearchText(window.getSelection(), getDocsPageElement());
      if (selectedText) setSearch(selectedText);
    };

    window.addEventListener('keydown', handleSearchShortcut, true);
    return () => window.removeEventListener('keydown', handleSearchShortcut, true);
  }, [open, setSearch]);

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      open={open}
      onOpenChange={onOpenChange}
      {...props}
    >
      <SearchDialogOverlay className="!bg-transparent" />
      <SearchDialogContent>
        <SearchDialogHeader className="search-dialog__header">
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== 'empty' ? query.data : null} />
        {/* Chapter remains a lightweight scope control. Taxonomy facets share a
            second popover so selecting one dimension does not hide the others.
            Chapter 保持轻量范围控件；分类筛选使用独立 Popover，选择一个维度后仍可继续组合其他维度。 */}
        <SearchDialogFooter className="search-dialog__scope-footer">
          {tags.length > 0 && (
            <div className="search-dialog__scope-control">
              <span className="search-dialog__scope-label">{labels.searchScopeLabel}</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    aria-label={labels.searchScopeLabel}
                    className="search-dialog__scope-trigger"
                    data-filtered={chapter ? 'true' : 'false'}
                    type="button"
                  >
                    <span aria-hidden="true" className="search-dialog__scope-indicator" />
                    <span className="search-dialog__scope-value">{selectedScope?.name}</span>
                    <ChevronDown aria-hidden="true" className="search-dialog__scope-chevron" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  aria-label={labels.searchScopeLabel}
                  className="search-dialog__scope-menu"
                  role="listbox"
                  sideOffset={6}
                >
                  {tags.map((scope) => {
                    const selected = scope.value === (chapter ?? '');

                    return (
                      <PopoverClose asChild key={scope.value}>
                        <button
                          aria-selected={selected}
                          className="search-dialog__scope-option"
                          onClick={() => setChapter(scope.value)}
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
            </div>
          )}
          <div className="search-dialog__facet-control">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  aria-label={labels.searchFacets.label}
                  className="search-dialog__facet-trigger"
                  data-filtered={activeFacetCount > 0 ? 'true' : 'false'}
                  type="button"
                >
                  <SlidersHorizontal aria-hidden="true" size={15} />
                  <span>{labels.searchFacets.label}</span>
                  {activeFacetCount > 0 && (
                    <span aria-hidden="true" className="search-dialog__facet-count">
                      {activeFacetCount}
                    </span>
                  )}
                  <ChevronDown aria-hidden="true" className="search-dialog__scope-chevron" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                aria-label={labels.searchFacets.label}
                className="search-dialog__facet-menu"
                sideOffset={6}
              >
                {facetDefinitions.map((facet) => {
                  const selected = facets[facet.id];

                  return (
                    <fieldset className="search-dialog__facet-group" key={facet.id}>
                      <legend>{labels.searchFacets[facet.id]}</legend>
                      <div className="search-dialog__facet-options">
                        <button
                          aria-pressed={selected === undefined}
                          className="search-dialog__facet-option"
                          onClick={() => updateFacet(facet.id, undefined)}
                          type="button"
                        >
                          {labels.searchFacets.clear}
                        </button>
                        {facet.options.map((option) => (
                          <button
                            aria-pressed={selected === option.id}
                            className="search-dialog__facet-option"
                            key={option.id}
                            onClick={() => updateFacet(facet.id, option.id)}
                            type="button"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  );
                })}
              </PopoverContent>
            </Popover>
          </div>
        </SearchDialogFooter>
      </SearchDialogContent>
    </SearchDialog>
  );
}
