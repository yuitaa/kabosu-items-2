import { itemEntries } from '@/data/item-views';
import { renderItemOgImage } from '@/lib/og/tooltip-image';
import type { APIRoute } from 'astro';

export function getStaticPaths() {
  return itemEntries.map(({ view }) => ({
    params: { slug: view.source.slug },
  }));
}

export const GET: APIRoute = async ({ params }) => {
  const entry = itemEntries.find((candidate) => candidate.view.source.slug === params.slug);

  if (!entry) {
    return new Response('Not found', { status: 404 });
  }

  const png = await renderItemOgImage(entry.presentation);

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
    },
  });
};
