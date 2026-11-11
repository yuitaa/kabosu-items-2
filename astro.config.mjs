// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // GitHub Pages project site: https://yuitaa.github.io/kabosu-items-2/
  site: 'https://yuitaa.github.io',
  base: '/kabosu-items-2',
  vite: {
    plugins: [tailwindcss()],
  },
});
