/**
 * Roman numeral used by Minecraft tooltips for enchantment and potion levels.
 * The bundled translations stop at level 10, so higher levels are converted
 * here. Levels of 1000 or more are not expected and fall back to the number.
 */
const NUMERALS: readonly (readonly [number, string])[] = [
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

export function toRoman(value: number): string {
  if (!Number.isInteger(value) || value < 1 || value > 999) {
    return String(value);
  }

  let remaining = value;
  let result = '';

  for (const [amount, numeral] of NUMERALS) {
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  }

  return result;
}
