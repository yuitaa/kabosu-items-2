import type { ItemSource } from '@/lib/minecraft/item/types';

/**
 * Item SNBT files are the source of truth. They are read as raw text at build
 * time so that the original formatting and non-ASCII text survive untouched.
 *
 * Files may live in subdirectories, and the slug includes the relative path so
 * that the directory structure is not lost (for example `event/foo`).
 */
const files = import.meta.glob('./**/*.snbt', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function slugFromPath(path: string): string {
  return path.replace(/^\.\//, '').replace(/\.snbt$/, '');
}

export const itemSources: ItemSource[] = Object.entries(files)
  .map(([path, snbt]) => ({
    slug: slugFromPath(path),
    snbt: snbt.trim(),
  }))
  .sort((a, b) => a.slug.localeCompare(b.slug));
