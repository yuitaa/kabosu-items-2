import type { NbtTag } from 'deepslate/nbt';

/**
 * Build a modern `/give` command from the parsed item AST.
 *
 * Since 1.20.5 item data is expressed as components inside square brackets,
 * for example `minecraft:book[minecraft:custom_name={...}]`. Component values
 * are written back as SNBT so the original data survives unchanged.
 */
export function buildGiveCommand(root: NbtTag | null): string | null {
  if (!root?.isCompound()) {
    return null;
  }

  const id = root.getString('id');
  if (!id) {
    return null;
  }

  const components = root.getCompound('components');
  const parts: string[] = [];

  for (const key of components.keys()) {
    const value = components.get(key);
    if (value) {
      parts.push(`${key}=${value.toString()}`);
    }
  }

  const item = parts.length > 0 ? `${id}[${parts.join(',')}]` : id;
  return `/give @p ${item} 1`;
}
