'use client';

import { useSearchContext } from 'fumadocs-ui/contexts/search';
import { Search } from 'lucide-react';
import { SEARCH_QUERY_PARAM, SEARCH_TAG_PARAM } from '../search-intent';

export function SearchTaxonomyAction({
  className,
  label,
  query,
  tag,
}: {
  className?: string;
  label: string;
  query?: string;
  tag: string;
}) {
  const { setOpenSearch } = useSearchContext();

  const handleClick = () => {
    const url = new URL(window.location.href);
    if (query) url.searchParams.set(SEARCH_QUERY_PARAM, query);
    else url.searchParams.delete(SEARCH_QUERY_PARAM);
    url.searchParams.set(SEARCH_TAG_PARAM, tag);
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
    setOpenSearch(true);
  };

  return (
    <button className={className} onClick={handleClick} type="button">
      <Search aria-hidden="true" size={16} />
      {label}
    </button>
  );
}
