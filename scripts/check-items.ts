import { buildGiveCommand } from '@/lib/minecraft/item/give';
import { loadItem } from '@/lib/minecraft/item/load';
import type { ItemSource } from '@/lib/minecraft/item/types';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ITEMS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'items');

function findSnbtFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...findSnbtFiles(path));
    } else if (entry.isFile() && entry.name.endsWith('.snbt')) {
      files.push(path);
    }
  }

  return files;
}

function slugFromPath(path: string): string {
  return relative(ITEMS_DIR, path)
    .split(sep)
    .join('/')
    .replace(/\.snbt$/, '');
}

const files = findSnbtFiles(ITEMS_DIR).sort();
let hasErrors = false;
let unknownCount = 0;

for (const file of files) {
  const source: ItemSource = {
    slug: slugFromPath(file),
    snbt: readFileSync(file, 'utf8').trim(),
  };
  const view = loadItem(source);

  if (view.error) {
    hasErrors = true;
    console.error(`error  ${source.slug}: ${view.error}`);
    continue;
  }

  if (view.issues.length > 0) {
    hasErrors = true;
    console.error(`invalid ${source.slug}: ${view.issues.map((issue) => issue.message).join('; ')}`);
    continue;
  }

  const unknown = view.components.filter((component) => component.kind === 'unknown');
  const invalid = view.components.filter((component) => component.kind === 'invalid');
  unknownCount += unknown.length;

  if (!buildGiveCommand(view.root)) {
    hasErrors = true;
    console.error(`invalid ${source.slug}: could not build give command`);
  }

  if (invalid.length > 0) {
    hasErrors = true;
    for (const component of invalid) {
      const message = component.issues.map((issue) => issue.message).join('; ');
      console.error(`invalid ${source.slug}: ${component.id}: ${message}`);
    }
  }

  for (const component of unknown) {
    console.info(`unknown ${source.slug}: ${component.id}`);
  }

  if (invalid.length === 0) {
    console.info(`ok      ${source.slug}`);
  }
}

console.info(`\n${files.length} item(s), ${unknownCount} unknown component(s)`);

process.exit(hasErrors ? 1 : 0);
