import { itemSources } from '@/data/items';
import { translate } from '@/data/minecraft/lang';
import { loadItem, type ItemView } from '@/lib/minecraft/item/load';
import { buildPresentation, type ItemPresentation } from '@/lib/minecraft/item/presentation';

export interface ItemEntry {
  view: ItemView;
  presentation: ItemPresentation;
}

const entries: ItemEntry[] = itemSources.map((source) => {
  const view = loadItem(source);
  return { view, presentation: buildPresentation(view.item, translate, source.slug) };
});

assertValidItems(entries);

/** Items are loaded and validated once at build time. */
export const itemEntries: ItemEntry[] = entries.sort((a, b) => {
  const byName = new Intl.Collator('ja').compare(a.presentation.plainName, b.presentation.plainName);
  return byName || a.view.source.slug.localeCompare(b.view.source.slug);
});

/**
 * Invalid data must never reach the generated site. Parsing or validation
 * failures abort the build with every problem listed at once.
 */
function assertValidItems(items: readonly ItemEntry[]): void {
  const failures = new Set<string>();

  for (const { view } of items) {
    if (view.error) {
      failures.add(`${view.source.slug}: ${view.error}`);
    }

    for (const issue of view.issues) {
      failures.add(`${view.source.slug}: ${issue.message}`);
    }

    for (const component of view.components) {
      if (component.kind !== 'invalid') {
        continue;
      }
      for (const issue of component.issues) {
        failures.add(`${view.source.slug}: ${component.id}: ${issue.message}`);
      }
    }
  }

  if (failures.size > 0) {
    throw new Error(`Invalid item data:\n${[...failures].join('\n')}`);
  }
}
