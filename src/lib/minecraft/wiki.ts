/**
 * Links to the Japanese Minecraft Wiki. A few pages share their title with
 * another topic, so the enchantment and status effect pages need a
 * disambiguating suffix (same list the previous site used).
 */
const WIKI_BASE = 'https://ja.minecraft.wiki/w/';

const AMBIGUOUS_ENCHANTMENTS = new Set(['火炎耐性', '幸運', '修繕', '水中呼吸']);
const AMBIGUOUS_EFFECTS = new Set(['火炎耐性', '幸運', '水中呼吸']);

export function enchantmentWikiUrl(name: string): string {
  return wikiUrl(name, AMBIGUOUS_ENCHANTMENTS.has(name) ? '_(エンチャント)' : '');
}

export function effectWikiUrl(name: string): string {
  return wikiUrl(name, AMBIGUOUS_EFFECTS.has(name) ? '_(ステータス効果)' : '');
}

function wikiUrl(title: string, suffix: string): string {
  return `${WIKI_BASE}${encodeURIComponent(`${title}${suffix}`)}`;
}
