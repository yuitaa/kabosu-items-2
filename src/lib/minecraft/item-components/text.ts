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

/** The named colors Minecraft uses in text components, as rendered RGB values. */
export const TEXT_COLORS = {
  black: '#000000',
  dark_blue: '#0000AA',
  dark_green: '#00AA00',
  dark_aqua: '#00AAAA',
  dark_red: '#AA0000',
  dark_purple: '#AA00AA',
  gold: '#FFAA00',
  gray: '#AAAAAA',
  dark_gray: '#555555',
  blue: '#5555FF',
  green: '#55FF55',
  aqua: '#55FFFF',
  red: '#FF5555',
  light_purple: '#FF55FF',
  yellow: '#FFFF55',
  white: '#FFFFFF',
} as const;

/**
 * Resolve a text component color to the hex value Minecraft actually renders.
 * Named colors are case-insensitive, and hex colors are normalized to
 * uppercase. Anything else is returned unchanged.
 */
export function resolveTextColor(color: string): string {
  const name = color.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(TEXT_COLORS, name)) {
    return TEXT_COLORS[name as keyof typeof TEXT_COLORS];
  }
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return `#${color.slice(1).toUpperCase()}`;
  }
  return color;
}

/** A rendered piece of text with all inherited styling resolved. */
export type TextSpanStyle = {
  color?: string;
  font?: string;
  shadow_color?: unknown;
  bold?: true;
  italic?: true;
  underlined?: true;
  strikethrough?: true;
  obfuscated?: true;
  insertion?: string;
  click_event?: unknown;
  hover_event?: unknown;
};

export type TextSpan = TextSpanStyle & {
  text: string;
};

type ResolvedStyle = {
  color?: string;
  font?: string;
  shadow_color?: unknown;
  bold: boolean;
  italic: boolean;
  underlined: boolean;
  strikethrough: boolean;
  obfuscated: boolean;
  insertion?: string;
  click_event?: unknown;
  hover_event?: unknown;
};

type InternalSpan = {
  text: string;
  style: ResolvedStyle;
};

const BOOLEAN_KEYS = ['bold', 'italic', 'underlined', 'strikethrough', 'obfuscated'] as const;

const ROOT_STYLE: ResolvedStyle = {
  bold: false,
  italic: false,
  underlined: false,
  strikethrough: false,
  obfuscated: false,
};

/**
 * Flatten a text component into styled text spans.
 *
 * Bare strings, arrays, `extra`, and translation arguments are expanded in
 * document order. Styles are inherited by children, colors are resolved to hex,
 * and adjacent spans with identical styles are merged. Non-literal content is
 * rendered from its primary field (`translate` key, score name, selector,
 * keybind, or NBT path).
 */
export function normalizeTextComponent(input: TextComponent): TextSpan[] {
  const spans = flatten(input, ROOT_STYLE);
  const merged: InternalSpan[] = [];

  for (const span of spans) {
    if (span.text === '') {
      continue;
    }

    const last = merged[merged.length - 1];
    if (last && sameStyle(last.style, span.style)) {
      last.text += span.text;
    } else {
      merged.push({ text: span.text, style: span.style });
    }
  }

  return merged.map(({ text, style }) => ({ text, ...toSpanStyle(style) }));
}

function flatten(input: unknown, inherited: ResolvedStyle): InternalSpan[] {
  if (input === null || input === undefined) {
    return [];
  }

  if (typeof input === 'string') {
    return [{ text: input, style: inherited }];
  }

  if (typeof input === 'number' || typeof input === 'boolean') {
    return [{ text: String(input), style: inherited }];
  }

  if (Array.isArray(input)) {
    return input.flatMap((item) => flatten(item, inherited));
  }

  if (!isRecord(input)) {
    return [];
  }

  const style = resolveStyle(input, inherited);
  const spans = contentSpans(input, style);
  const extra = Array.isArray(input.extra) ? flatten(input.extra, style) : [];

  return [...spans, ...extra];
}

function contentSpans(node: Record<string, unknown>, style: ResolvedStyle): InternalSpan[] {
  if (typeof node.text === 'string') {
    return [{ text: node.text, style }];
  }

  if (typeof node.text === 'number' || typeof node.text === 'boolean') {
    return [{ text: String(node.text), style }];
  }

  if (typeof node.translate === 'string') {
    const text = typeof node.fallback === 'string' ? node.fallback : node.translate;
    const args = Array.isArray(node.with) ? node.with.flatMap((arg) => flatten(arg, style)) : [];
    // Translation arguments are content, while `separator` only applies when a
    // component resolves to multiple values, which we cannot do statically.
    return [{ text, style }, ...args];
  }

  if (isRecord(node.score) && typeof node.score.name === 'string') {
    return [{ text: node.score.name, style }];
  }

  if (typeof node.selector === 'string') {
    return [{ text: node.selector, style }];
  }

  if (typeof node.keybind === 'string') {
    return [{ text: node.keybind, style }];
  }

  if (typeof node.nbt === 'string') {
    return [{ text: node.nbt, style }];
  }

  return [];
}

function resolveStyle(node: Record<string, unknown>, inherited: ResolvedStyle): ResolvedStyle {
  const style: ResolvedStyle = { ...inherited };

  if (typeof node.color === 'string') {
    style.color = resolveTextColor(node.color);
  }
  if (typeof node.font === 'string') {
    style.font = node.font;
  }
  if (node.shadow_color !== undefined) {
    style.shadow_color = node.shadow_color;
  }
  if (typeof node.insertion === 'string') {
    style.insertion = node.insertion;
  }
  if (node.click_event !== undefined) {
    style.click_event = node.click_event;
  }
  if (node.hover_event !== undefined) {
    style.hover_event = node.hover_event;
  }

  for (const key of BOOLEAN_KEYS) {
    const value = node[key];
    if (value !== undefined) {
      style[key] = toBoolean(value);
    }
  }

  return style;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    return value === 'true' || value === '1';
  }
  return false;
}

function sameStyle(a: ResolvedStyle, b: ResolvedStyle): boolean {
  return (
    a.color === b.color &&
    a.font === b.font &&
    a.shadow_color === b.shadow_color &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underlined === b.underlined &&
    a.strikethrough === b.strikethrough &&
    a.obfuscated === b.obfuscated &&
    a.insertion === b.insertion &&
    a.click_event === b.click_event &&
    a.hover_event === b.hover_event
  );
}

function toSpanStyle(style: ResolvedStyle): TextSpanStyle {
  const result: TextSpanStyle = {};

  if (style.color !== undefined) {
    result.color = style.color;
  }
  if (style.font !== undefined) {
    result.font = style.font;
  }
  if (style.shadow_color !== undefined) {
    result.shadow_color = style.shadow_color;
  }
  if (style.insertion !== undefined) {
    result.insertion = style.insertion;
  }
  if (style.click_event !== undefined) {
    result.click_event = style.click_event;
  }
  if (style.hover_event !== undefined) {
    result.hover_event = style.hover_event;
  }
  if (style.bold) {
    result.bold = true;
  }
  if (style.italic) {
    result.italic = true;
  }
  if (style.underlined) {
    result.underlined = true;
  }
  if (style.strikethrough) {
    result.strikethrough = true;
  }
  if (style.obfuscated) {
    result.obfuscated = true;
  }

  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
