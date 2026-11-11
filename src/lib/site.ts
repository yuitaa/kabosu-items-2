/** Site-wide metadata shared by the layout and social previews. */
export const SITE_NAME = 'Kabosu Items';
export const SITE_DESCRIPTION = 'かぼすサーバーのアイテム情報を閲覧できる非公式サイトです。';
export const THEME_COLOR = '#16611f';
export const GITHUB_URL = 'https://github.com/yuitaa/kabosu-items-2';
export const KABOSU_URL = 'https://kabosu.localinfo.jp/';

/** Social preview image (the lemon icon used by the previous site). */
export const OG_IMAGE = '/lemon.png';
export const OG_IMAGE_ALT = 'かぼすのアイコン';
export const OG_IMAGE_WIDTH = 384;
export const OG_IMAGE_HEIGHT = 384;

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const SITE = import.meta.env.SITE;

/** Prefix a public path with the configured `base` (`/kabosu-items-2`). */
export function withBase(path: string): string {
  const normalized = path.replace(/^\//, '');
  return normalized ? `${BASE}/${normalized}` : `${BASE}/`;
}

/** Turn a public path into an absolute URL for meta tags. */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  return new URL(withBase(path), SITE).href;
}

/** Absolute canonical URL for the current page, with a trailing slash. */
export function canonicalUrl(pathname: string): string {
  const alreadyBased = pathname === BASE || pathname.startsWith(`${BASE}/`);
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const path = alreadyBased ? pathname : `${BASE}${withLeadingSlash}`;
  const url = new URL(path, SITE);

  if (!url.pathname.endsWith('/')) {
    url.pathname += '/';
  }

  return url.href;
}
