// Prettier plugin that sorts Tailwind CSS classes in `.astro` files.
//
// `prettier-plugin-tailwindcss` can't sort Astro attributes with
// `prettier-plugin-astro` v1+, because the Astro plugin now emits a JSX-style
// AST while the Tailwind plugin still expects the old Astro node shapes.
// This plugin wraps the Astro parser and sorts classes via the Tailwind
// plugin's public sorter API instead.

import { fileURLToPath } from 'node:url';

import * as astroPlugin from 'prettier-plugin-astro';
import { createSorter } from 'prettier-plugin-tailwindcss/sorter';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const CLASS_ATTRIBUTES = new Set(['class', 'className']);

let sorterPromise;

function getSorter() {
  sorterPromise ??= createSorter({
    base: projectRoot,
    stylesheetPath: './src/styles/global.css',
  });

  return sorterPromise;
}

function sortClassAttributes(node, sorter, visited = new Set()) {
  if (!node || typeof node !== 'object' || visited.has(node)) return;
  visited.add(node);

  if (node.type === 'JSXAttribute' && node.name?.type === 'JSXIdentifier' && CLASS_ATTRIBUTES.has(node.name.name)) {
    const value = node.value;

    if (value?.type === 'Literal' && typeof value.value === 'string') {
      const [sorted] = sorter.sortClassAttributes([value.value]);

      if (sorted !== value.value) {
        value.value = sorted;
        value.raw = JSON.stringify(sorted);
      }
    }
  }

  for (const [key, child] of Object.entries(node)) {
    if (key === 'parent' || key === 'loc' || key === 'range') continue;

    if (Array.isArray(child)) {
      for (const item of child) sortClassAttributes(item, sorter, visited);
    } else {
      sortClassAttributes(child, sorter, visited);
    }
  }
}

const astroParser = astroPlugin.parsers.astro;

export const parsers = {
  astro: {
    ...astroParser,
    async parse(text, options) {
      const ast = await astroParser.parse(text, options);
      sortClassAttributes(ast, await getSorter());

      return ast;
    },
  },
};
