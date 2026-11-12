import type { TextComponent, TextSpan } from '@/lib/minecraft/item-components/text';
import { normalizeTextComponent } from '@/lib/minecraft/item-components/text';
import type { ItemStack } from '@/lib/minecraft/item/types';
import { formatMessage } from '@/lib/minecraft/text/format';
import { toRoman } from '@/lib/minecraft/text/roman';
import type { Translator } from '@/lib/minecraft/text/translate';

export interface EnchantmentRow {
  id: string;
  name: string;
  level: string;
  levelValue: number;
  /** Roman numeral shown in the tooltip. */
  levelLabel: string;
}

export interface AttributeRow {
  id: string;
  name: string;
  header: string;
  text: string;
  /** Just the signed amount, for the detail table. */
  value: string;
  amount: number;
  operation: string;
}

export interface AttributeGroup {
  header: string;
  rows: AttributeRow[];
}

export interface PotionRow {
  name: string;
  level: string;
  /** Roman numeral shown in the tooltip; empty for the base potion name. */
  levelLabel: string;
  duration: string;
}

export interface ExtraRow {
  text: string;
  /** Hex color for a swatch (currently only used by `dyed_color`). */
  swatch?: string;
  /** Unbreakable and dye lines are shown below lore in the tooltip. */
  afterLore?: boolean;
}

/** Structured trim data shared by the tooltip and the basic information table. */
export interface TrimInfo {
  material: string;
  pattern: string;
  /** Combined label, e.g. `金素材の彫刻家の装飾`. */
  text: string;
}

/** Everything the tooltip, the detail tables, and the Discord ANSI share. */
export interface ItemPresentation {
  name: TextSpan[];
  plainName: string;
  /** The vanilla item name from the translation file, ignoring `custom_name`. */
  itemName: string;
  unbreakable: boolean;
  /** Hex color from `dyed_color`, or `null` when the item is not dyed. */
  dyedColor: string | null;
  /** Trim material and pattern, or `null` when the item has no trim. */
  trim: TrimInfo | null;
  lore: TextSpan[][];
  enchantments: EnchantmentRow[];
  attributes: AttributeRow[];
  potions: PotionRow[];
  extras: ExtraRow[];
}

const RARITY_COLORS: Record<string, string> = {
  common: '#FFFFFF',
  uncommon: '#FFFF55',
  rare: '#55FFFF',
  epic: '#FF55FF',
};

const OPERATIONS = {
  add_value: { positive: 'attribute.modifier.plus.0', negative: 'attribute.modifier.take.0', scale: 1 },
  add_multiplied_base: {
    positive: 'attribute.modifier.plus.1',
    negative: 'attribute.modifier.take.1',
    scale: 100,
  },
  add_multiplied_total: {
    positive: 'attribute.modifier.plus.2',
    negative: 'attribute.modifier.take.2',
    scale: 100,
  },
} as const;

/**
 * Derive the display model from a typed item. Everything here is presentation
 * logic: the raw SNBT stays the source of truth and this is computed at build
 * time.
 */
export function buildPresentation(item: ItemStack | null, t: Translator, fallbackName: string): ItemPresentation {
  if (!item) {
    return {
      name: [{ text: fallbackName }],
      plainName: fallbackName,
      itemName: fallbackName,
      unbreakable: false,
      dyedColor: null,
      trim: null,
      lore: [],
      enchantments: [],
      attributes: [],
      potions: [],
      extras: [],
    };
  }

  const components = (item.components ?? {}) as Record<string, unknown>;
  const unbreakable = components['minecraft:unbreakable'] !== undefined;
  const name = buildName(item.id, components, t);
  const dyedColor = colorToHex(components['minecraft:dyed_color']) ?? null;
  const trim = buildTrim(components, t);

  return {
    name,
    plainName: name.map((span) => span.text).join('') || fallbackName,
    itemName: t(resourceKey('item', item.id), item.id),
    unbreakable,
    dyedColor,
    trim,
    lore: buildLore(components['minecraft:lore']),
    enchantments: buildEnchantments(components, t),
    attributes: buildAttributes(components, t),
    potions: buildPotions(components, t),
    extras: buildExtras(components, t, trim, dyedColor),
  };
}

export function groupAttributes(rows: readonly AttributeRow[]): AttributeGroup[] {
  const groups: AttributeGroup[] = [];

  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.header === row.header) {
      last.rows.push(row);
    } else {
      groups.push({ header: row.header, rows: [row] });
    }
  }

  return groups;
}

export function stripNamespace(id: string): string {
  const index = id.indexOf(':');
  return index === -1 ? id : id.slice(index + 1);
}

/**
 * Build a translation key from a resource location, e.g.
 * `minecraft:gold` -> `trim_material.minecraft.gold`.
 */
function resourceKey(prefix: string, id: string): string {
  return `${prefix}.${id.includes(':') ? id.replace(':', '.') : `minecraft.${id}`}`;
}

function buildName(itemId: string, components: Record<string, unknown>, t: Translator): TextSpan[] {
  const rarity = rarityColor(components['minecraft:rarity']);
  const customName = components['minecraft:custom_name'];

  if (customName !== undefined) {
    const spans = normalizeTextComponent(customName as TextComponent);
    if (spans.length > 0) {
      return spans.map((span) => (span.color === undefined ? { ...span, color: rarity } : span));
    }
  }

  return [{ text: t(resourceKey('item', itemId), itemId), color: rarity }];
}

function rarityColor(value: unknown): string {
  if (typeof value === 'string') {
    return RARITY_COLORS[value] ?? RARITY_COLORS.common;
  }
  return RARITY_COLORS.common;
}

function buildLore(value: unknown): TextSpan[][] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((line) => normalizeTextComponent(line as TextComponent));
}

function buildEnchantments(components: Record<string, unknown>, t: Translator): EnchantmentRow[] {
  const source = components['minecraft:enchantments'] ?? components['minecraft:stored_enchantments'];
  if (!isRecord(source)) {
    return [];
  }

  return Object.entries(source).flatMap(([id, level]) => {
    if (typeof level !== 'number') {
      return [];
    }
    return [
      {
        id,
        name: t(resourceKey('enchantment', id), id),
        level: String(level),
        levelValue: level,
        levelLabel: toRoman(level),
      },
    ];
  });
}

function buildAttributes(components: Record<string, unknown>, t: Translator): AttributeRow[] {
  const value = components['minecraft:attribute_modifiers'];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((modifier) => {
    if (!isRecord(modifier) || typeof modifier.type !== 'string') {
      return [];
    }

    const amount = typeof modifier.amount === 'number' ? modifier.amount : 0;
    const operation = typeof modifier.operation === 'string' ? modifier.operation : 'add_value';
    const slot = typeof modifier.slot === 'string' ? modifier.slot : 'any';
    const formatted = formatAttribute(modifier.type, amount, operation, t);

    return [
      {
        id: modifier.type,
        name: t(`attribute.name.${stripNamespace(modifier.type)}`, modifier.type),
        header: t(`item.modifiers.${slot}`, slot),
        text: formatted.text,
        value: formatted.value,
        amount,
        operation,
      },
    ];
  });
}

function formatAttribute(
  type: string,
  amount: number,
  operation: string,
  t: Translator,
): { text: string; value: string } {
  const spec = OPERATIONS[operation as keyof typeof OPERATIONS] ?? OPERATIONS.add_value;
  const template = t(amount < 0 ? spec.negative : spec.positive, '%2$s %1$s');
  const magnitude = formatNumber(Math.abs(amount) * spec.scale);
  const name = t(`attribute.name.${stripNamespace(type)}`, type);
  const suffix = operation === 'add_value' ? '' : '%';

  return {
    text: formatMessage(template, [magnitude, name]),
    value: `${amount < 0 ? '-' : '+'}${magnitude}${suffix}`,
  };
}

function buildPotions(components: Record<string, unknown>, t: Translator): PotionRow[] {
  const contents = components['minecraft:potion_contents'];
  if (!isRecord(contents)) {
    return [];
  }

  const rows: PotionRow[] = [];

  if (typeof contents.potion === 'string') {
    rows.push({
      name: t(`item.minecraft.potion.effect.${stripNamespace(contents.potion)}`, contents.potion),
      level: '',
      levelLabel: '',
      duration: '',
    });
  }

  if (Array.isArray(contents.custom_effects)) {
    for (const effect of contents.custom_effects) {
      if (!isRecord(effect) || typeof effect.id !== 'string') {
        continue;
      }
      const amplifier = typeof effect.amplifier === 'number' ? effect.amplifier : 0;
      const level = amplifier + 1;
      rows.push({
        name: t(resourceKey('effect', effect.id), effect.id),
        level: String(level),
        levelLabel: toRoman(level),
        duration: typeof effect.duration === 'number' ? formatDuration(effect.duration) : '',
      });
    }
  }

  return rows;
}

function buildTrim(components: Record<string, unknown>, t: Translator): TrimInfo | null {
  const trim = components['minecraft:trim'];
  if (!isRecord(trim) || typeof trim.material !== 'string' || typeof trim.pattern !== 'string') {
    return null;
  }

  const material = t(resourceKey('trim_material', trim.material), trim.material);
  const pattern = t(resourceKey('trim_pattern', trim.pattern), trim.pattern);
  return { material, pattern, text: `${material}の${pattern}` };
}

function buildExtras(
  components: Record<string, unknown>,
  t: Translator,
  trim: TrimInfo | null,
  dyedColor: string | null,
): ExtraRow[] {
  const extras: ExtraRow[] = [];

  if (components['minecraft:unbreakable'] !== undefined) {
    extras.push({ text: t('item.unbreakable'), afterLore: true });
  }

  if (trim) {
    extras.push({ text: trim.text });
  }

  if (components['minecraft:dyed_color'] !== undefined) {
    extras.push({ text: t('item.dyed'), swatch: dyedColor ?? undefined, afterLore: true });
  }

  return extras;
}

function colorToHex(value: unknown): string | undefined {
  const component = Array.isArray(value) ? rgbToHex(value) : typeof value === 'number' ? intToHex(value) : undefined;
  return component;
}

function intToHex(value: number): string {
  return `#${Math.max(0, Math.floor(value)).toString(16).padStart(6, '0').toUpperCase()}`;
}

function rgbToHex(value: unknown[]): string | undefined {
  if (value.length !== 3 || !value.every((channel) => typeof channel === 'number')) {
    return undefined;
  }
  return `#${value
    .map((channel) =>
      Math.max(0, Math.min(255, Math.floor(channel as number)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase()}`;
}

function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function formatDuration(ticks: number): string {
  const totalSeconds = Math.floor(ticks / 20);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
