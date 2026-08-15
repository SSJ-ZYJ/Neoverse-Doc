import type { Locale } from '@/lib/i18n';

export type LocalizedTaxonomyText = Readonly<Record<Locale, string>>;

export interface TaxonomyEntry<Id extends string = string> {
  readonly id: Id;
  readonly label: LocalizedTaxonomyText;
  readonly order: number;
  readonly description?: LocalizedTaxonomyText;
}

export type TaxonomyEntries = readonly [TaxonomyEntry, ...TaxonomyEntry[]];

export type TaxonomyId<Entries extends TaxonomyEntries> = Entries[number]['id'];

export type TaxonomyIds<Entries extends TaxonomyEntries> = {
  readonly [Index in keyof Entries]: Entries[Index] extends TaxonomyEntry<infer Id> ? Id : never;
};

/**
 * Defines one closed taxonomy vocabulary. IDs and display order must stay
 * unique so consumers can treat the registry as the canonical source.
 * 定义一个封闭的分类词汇表，ID 与展示顺序均须唯一。
 */
export function defineTaxonomy<const Entries extends TaxonomyEntries>(entries: Entries): Entries {
  const ids = new Set<string>();
  const orders = new Set<number>();

  for (const entry of entries) {
    if (ids.has(entry.id)) {
      throw new Error(`Taxonomy contains a duplicate ID: ${entry.id}`);
    }
    if (orders.has(entry.order)) {
      throw new Error(`Taxonomy contains a duplicate order: ${entry.order}`);
    }
    ids.add(entry.id);
    orders.add(entry.order);
  }

  return entries;
}

export function taxonomyIds<const Entries extends TaxonomyEntries>(
  entries: Entries,
): TaxonomyIds<Entries> {
  return entries.map((entry) => entry.id) as TaxonomyIds<Entries>;
}

export function getTaxonomyEntry<Entries extends TaxonomyEntries>(
  entries: Entries,
  id: TaxonomyId<Entries>,
): Entries[number] | undefined {
  return entries.find((entry) => entry.id === id) as Entries[number] | undefined;
}

export function getTaxonomyLabel(entry: TaxonomyEntry, locale: Locale): string {
  return entry.label[locale];
}
