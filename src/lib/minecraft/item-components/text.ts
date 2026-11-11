import * as v from 'valibot';

/**
 * A Minecraft text component. The format is recursive and very permissive:
 * strings, numbers, booleans, arrays of components, and objects with optional
 * `text` / `translate` / `extra` style keys are all valid.
 *
 * This schema only checks the overall shape. Keys inside the object form are
 * kept as-is rather than validated one by one.
 */
export type TextComponent = string | number | boolean | TextComponent[] | { [key: string]: unknown };

export const TextComponent: v.GenericSchema<unknown, TextComponent> = v.lazy(() =>
  v.union([v.string(), v.number(), v.boolean(), v.array(TextComponent), v.record(v.string(), v.unknown())]),
);
