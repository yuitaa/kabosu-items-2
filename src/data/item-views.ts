import { itemSources } from '@/data/items';
import { translate } from '@/data/minecraft/lang';
import { loadItem, type ItemView } from '@/lib/minecraft/item/load';
import { buildPresentation, type ItemPresentation } from '@/lib/minecraft/item/presentation';

export interface ItemEntry {
  view: ItemView;
  presentation: ItemPresentation;
}

/** Items are loaded and validated once at build time. */
export const itemEntries: ItemEntry[] = itemSources
  .map((source) => {
    const view = loadItem(source);
    return { view, presentation: buildPresentation(view.item, translate, source.slug) };
  })
  .sort((a, b) => {
    const byName = new Intl.Collator('ja').compare(a.presentation.plainName, b.presentation.plainName);
    return byName || a.view.source.slug.localeCompare(b.view.source.slug);
  });
