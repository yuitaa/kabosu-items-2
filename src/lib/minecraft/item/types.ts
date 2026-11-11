import type * as v from 'valibot';
import type { ComponentId, componentSchemas } from '../item-components/schemas';

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
  /** Defaults to 1 when absent. */
  count?: number;
  components?: ItemComponents;
}

/** Raw source data: an SNBT string is the source of truth. */
export interface ItemSource {
  slug: string;
  snbt: string;
}
