export type Translator = (key: string, fallback?: string) => string;

/**
 * Look up a translation key, falling back to an explicit default and finally to
 * the key itself. Kept free of Astro and of any specific locale so the same
 * helper can be reused elsewhere.
 */
export function createTranslator(messages: Record<string, string>): Translator {
  return (key, fallback) => messages[key] ?? fallback ?? key;
}
