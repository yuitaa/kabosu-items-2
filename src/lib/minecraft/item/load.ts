import { schemaById } from '@/lib/minecraft/item-components/schemas';
import { ItemStackSchema } from '@/lib/minecraft/item/schema';
import type { ItemSource, ItemStack } from '@/lib/minecraft/item/types';
import { parseSnbt, toPlain } from '@/lib/minecraft/snbt';
import type { NbtTag } from 'deepslate/nbt';
import * as v from 'valibot';

export type ComponentView =
  | { id: string; kind: 'valid'; raw: unknown; value: unknown }
  | { id: string; kind: 'invalid'; raw: unknown; issues: v.BaseIssue<unknown>[] }
  | { id: string; kind: 'unknown'; raw: unknown };

export interface ItemView {
  source: ItemSource;
  /** The parsed NBT AST, kept for pretty-printing and re-serialization. */
  root: NbtTag | null;
  /** The typed item, or `null` when the whole item failed validation. */
  item: ItemStack | null;
  /** Per-component results, so one bad component cannot blank the page. */
  components: ComponentView[];
  issues: v.BaseIssue<unknown>[];
  error?: string;
}

export function loadItem(source: ItemSource): ItemView {
  const parsed = parseSnbt(source.snbt);
  if (!parsed.ok) {
    return {
      source,
      root: null,
      item: null,
      components: [],
      issues: [],
      error: parsed.error,
    };
  }

  const { root } = parsed;
  const result = v.safeParse(ItemStackSchema, toPlain(root));

  const componentMap = root.isCompound() ? toPlain(root.getCompound('components')) : undefined;

  const components = isPlainObject(componentMap)
    ? Object.entries(componentMap).map(([id, raw]) => validateComponent(id, raw))
    : [];

  return {
    source,
    root,
    item: result.success ? result.output : null,
    components,
    issues: result.success ? [] : result.issues,
  };
}

function validateComponent(id: string, raw: unknown): ComponentView {
  const schema = schemaById[id];
  if (!schema) {
    return { id, kind: 'unknown', raw };
  }

  const result = v.safeParse(schema, raw);
  return result.success
    ? { id, kind: 'valid', raw, value: result.output }
    : { id, kind: 'invalid', raw, issues: result.issues };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
