import { NbtTag } from 'deepslate/nbt';

/**
 * Result of parsing an SNBT string. Parsing is done at build time only; the
 * original string stays the source of truth.
 */
export type SnbtParseResult = { ok: true; root: NbtTag } | { ok: false; error: string };

export function parseSnbt(source: string): SnbtParseResult {
  try {
    return { ok: true, root: NbtTag.fromString(source) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Project an NBT tag onto plain JS values for Valibot.
 *
 * Note that `toSimplifiedJson()` loses tag types: bytes (and therefore SNBT
 * booleans) become numbers, and longs become numbers. Component schemas
 * account for the boolean case with `BooleanLike`.
 */
export function toPlain(root: NbtTag): unknown {
  return root.toSimplifiedJson();
}
