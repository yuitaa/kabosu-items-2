/**
 * Minimal implementation of the positional format strings used by Minecraft
 * translation keys, e.g. `%1$s`, `%2$s` and `%%`.
 */
export function formatMessage(template: string, args: readonly (string | number)[] = []): string {
  let next = 0;

  return template.replace(/%%|%(\d+\$)?[sd]/g, (match: string, position: string | undefined) => {
    if (match === '%%') {
      return '%';
    }

    const index = position === undefined ? next++ : Number(position.slice(0, -1)) - 1;
    const value = args[index];
    return value === undefined ? match : String(value);
  });
}
