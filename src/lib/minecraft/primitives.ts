import * as v from 'valibot';

/**
 * A Minecraft namespaced identifier. The namespace part may be omitted, which
 * is common in command syntax (`damage` instead of `minecraft:damage`).
 */
export const ResourceLocation = v.pipe(v.string(), v.regex(/^(?:[a-z0-9_.-]+:)?[a-z0-9_./-]+$/));

/** A resource location used as a tag, e.g. `#minecraft:is_fire`. */
export const TagId = v.pipe(v.string(), v.regex(/^#(?:[a-z0-9_.-]+:)?[a-z0-9_./-]+$/));

/**
 * SNBT serializes booleans as bytes (`true` -> `1b`), and
 * `toSimplifiedJson()` turns every byte into a number. Accept both forms and
 * normalize to a real boolean.
 */
export const BooleanLike = v.union([
  v.boolean(),
  v.pipe(
    v.number(),
    v.integer(),
    v.minValue(0),
    v.maxValue(1),
    v.transform((n) => n !== 0),
  ),
]);

export const Int = v.pipe(v.number(), v.integer());
export const NonNegativeInt = v.pipe(Int, v.minValue(0));
export const PositiveInt = v.pipe(Int, v.minValue(1));
export const Float = v.number();

export const DyeColor = v.picklist([
  'white',
  'orange',
  'magenta',
  'light_blue',
  'yellow',
  'lime',
  'pink',
  'gray',
  'light_gray',
  'cyan',
  'purple',
  'blue',
  'brown',
  'green',
  'red',
  'black',
]);
