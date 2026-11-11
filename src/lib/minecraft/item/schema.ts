import { ItemComponentsSchema } from '@/lib/minecraft/item-components/schemas';
import type { ItemStack } from '@/lib/minecraft/item/types';
import { ResourceLocation } from '@/lib/minecraft/primitives';
import * as v from 'valibot';

/**
 * An item stack in SNBT form (`{id, count, components}`).
 *
 * `components` is optional because Minecraft defaults it. `count` is accepted
 * in the source SNBT but dropped before validation, since the UI never shows
 * it, so it is not part of the typed item.
 *
 * Top-level keys we do not know about are preserved via `objectWithRest`.
 */
export const ItemStackSchema = v.objectWithRest(
  {
    id: ResourceLocation,
    components: v.optional(ItemComponentsSchema),
  },
  v.unknown(),
);

export type ParsedItemStack = v.InferOutput<typeof ItemStackSchema>;

/** Compile-time check that the schema output matches the hand-written type. */
const _typecheck: ItemStack = {} as ParsedItemStack;
void _typecheck;
