import * as v from 'valibot';
import { ItemComponentsSchema } from '../item-components/schemas';
import { ResourceLocation } from '../primitives';
import type { ItemStack } from './types';

/**
 * An item stack in SNBT form (`{id, count, components}`).
 *
 * `count` and `components` are optional because Minecraft defaults them.
 * Top-level keys we do not know about are preserved via `objectWithRest`.
 */
export const ItemStackSchema = v.objectWithRest(
  {
    id: ResourceLocation,
    count: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(99))),
    components: v.optional(ItemComponentsSchema),
  },
  v.unknown(),
);

export type ParsedItemStack = v.InferOutput<typeof ItemStackSchema>;

/** Compile-time check that the schema output matches the hand-written type. */
const _typecheck: ItemStack = {} as ParsedItemStack;
void _typecheck;
