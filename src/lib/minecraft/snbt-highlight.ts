import Prism from 'prismjs';

/**
 * A small SNBT grammar for Prism. SNBT is close to JavaScript object syntax,
 * but keys are unquoted and numeric literals may carry a type suffix (`1b`,
 * `9.0d`, ...), so a dedicated grammar gives cleaner tokens.
 */
const snbtGrammar: Prism.Grammar = {
  string: {
    pattern: /"(?:[^"\\]|\\.)*"/,
    greedy: true,
  },
  key: {
    pattern: /(^|[{,]\s*)[A-Za-z0-9_.+-]+(?=\s*:)/,
    lookbehind: true,
    alias: 'property',
  },
  number: /-?\d+(?:\.\d+)?[bBsSlLfFdD]?/,
  boolean: /\b(?:true|false)\b/,
  punctuation: /[{}\[\],:;]/,
};

/** Highlight normalized SNBT at build time. */
export function highlightSnbt(code: string): string {
  return Prism.highlight(code, snbtGrammar, 'snbt');
}
