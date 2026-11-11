import type { ComponentId, componentSchemas } from '@/lib/minecraft/item-components/schemas';
import type * as v from 'valibot';

export type ComponentValue<K extends ComponentId> = v.InferOutput<(typeof componentSchemas)[K]>;

/**
 * The typed component map. Known component IDs get their schema output type,
 * and any other component is kept as unknown rather than rejected.
 */
export type ItemComponents = {
  [K in ComponentId]?: ComponentValue<K>;
} & {
  [componentId: string]: unknown;
};

export interface ItemStack {
  id: string;
  components?: ItemComponents;
}

/** Raw source data: an SNBT string is the source of truth. */
export interface ItemSource {
  slug: string;
  snbt: string;
}
