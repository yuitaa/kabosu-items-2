import type { TextSpan } from '@/lib/minecraft/item-components/text';
import { groupAttributes, type ItemPresentation } from '@/lib/minecraft/item/presentation';

/**
 * Discord's ANSI code blocks only render the eight base colors, so custom hex
 * colors are collapsed onto the nearest one. The palette and distance metric
 * are ported from the previous site's `ansi.js`.
 */
const ESC = '\u001B';
const RESET = `${ESC}[0m`;

const ANSI_PALETTE = [
  { rgb: [78, 80, 88], code: 30 },
  { rgb: [220, 50, 47], code: 31 },
  { rgb: [133, 153, 0], code: 32 },
  { rgb: [181, 137, 0], code: 33 },
  { rgb: [38, 139, 210], code: 34 },
  { rgb: [211, 54, 130], code: 35 },
  { rgb: [42, 161, 152], code: 36 },
  { rgb: [255, 255, 255], code: 37 },
] as const;

type AnsiState = {
  color?: number;
  bold: boolean;
  underlined: boolean;
};

const DEFAULT_STATE: AnsiState = { color: undefined, bold: false, underlined: false };

type AnsiLine = { kind: 'styled'; spans: readonly TextSpan[] } | { kind: 'text'; text: string };

/**
 * Build the `ansi` fenced code block that can be pasted into Discord.
 *
 * The content is wrapped in resets on both ends: one right after the opening
 * fence and one at the end of the last line, so no style can leak into the
 * closing fence.
 */
export function buildDiscordAnsi(presentation: ItemPresentation): string {
  const content = `${RESET}${renderLines(presentationLines(presentation))}${RESET}`;
  return ['```ansi', content, '```'].join('\n');
}

/**
 * Render the presentation as ANSI escapes.
 *
 * The escape state is carried across lines: only the attributes that actually
 * change are emitted, and a line that continues the previous style costs no
 * escapes at all. Full resets are used whenever an attribute has to be turned
 * off, because Discord only reliably understands `0`, `1`, `4` and `30`-`37`.
 */
function renderLines(lines: readonly AnsiLine[]): string {
  let state = DEFAULT_STATE;
  const out: string[] = [];

  for (const line of lines) {
    if (line.kind === 'text') {
      if (!isDefault(state)) {
        if (out.length > 0) {
          out[out.length - 1] += RESET;
        } else {
          out.push(RESET);
        }
        state = DEFAULT_STATE;
      }
      out.push(line.text);
      continue;
    }

    let text = '';
    for (const span of line.spans) {
      if (span.text === '') {
        continue;
      }
      const next = styleOf(span);
      const codes = transitionCodes(state, next);
      if (codes.length > 0) {
        text += `${ESC}[${codes.join(';')}m`;
      }
      text += span.text;
      state = next;
    }
    out.push(text);
  }

  return out.join('\n');
}

function presentationLines(presentation: ItemPresentation): AnsiLine[] {
  const lines: AnsiLine[] = [{ kind: 'styled', spans: presentation.name }];

  if (presentation.enchantments.length > 0) {
    lines.push({ kind: 'text', text: 'エンチャント' });
    for (const row of presentation.enchantments) {
      lines.push({ kind: 'text', text: ` - ${row.name} ${row.levelLabel}`.trimEnd() });
    }
  }

  if (presentation.attributes.length > 0) {
    lines.push({ kind: 'text', text: '追加効果' });
    for (const group of groupAttributes(presentation.attributes)) {
      lines.push({ kind: 'text', text: ` - ${group.header}` });
      for (const row of group.rows) {
        lines.push({ kind: 'text', text: `   - ${row.text}` });
      }
    }
  }

  if (presentation.potions.length > 0) {
    lines.push({ kind: 'text', text: 'ポーション効果' });
    for (const row of presentation.potions) {
      const detail = [row.name, row.levelLabel, row.duration && `(${row.duration})`].filter(Boolean).join(' ');
      lines.push({ kind: 'text', text: ` - ${detail}` });
    }
  }

  if (presentation.firework) {
    lines.push({ kind: 'text', text: presentation.firework.flightText });
    for (const explosion of presentation.firework.explosions) {
      const count = explosion.count > 1 ? ` x ${explosion.count}` : '';
      lines.push({ kind: 'text', text: ` - ${explosion.shape}${count}` });
      for (const color of explosion.colors) {
        lines.push({ kind: 'text', text: `   - ${color.name ?? color.hex}` });
      }
      if (explosion.fadeColors.length > 0) {
        const colors = explosion.fadeColors.map((color) => color.name ?? color.hex).join(' ');
        lines.push({ kind: 'text', text: `   - ${explosion.fadeLabel}${colors}` });
      }
      for (const effect of explosion.effects) {
        lines.push({ kind: 'text', text: `   - ${effect}` });
      }
    }
  }

  if (presentation.banner) {
    if (presentation.banner.baseColor) {
      lines.push({ kind: 'text', text: ` - ${presentation.banner.baseColorLabel} ${presentation.banner.baseColor}` });
    }
    if (presentation.banner.patterns.length > 0) {
      lines.push({ kind: 'text', text: ` - ${presentation.banner.patternsLabel}` });
      for (const pattern of presentation.banner.patterns) {
        lines.push({ kind: 'text', text: `   - ${pattern.text}` });
      }
    }
  }

  for (const extra of presentation.extras) {
    lines.push({ kind: 'text', text: ` - ${extra.text}` });
  }

  for (const line of presentation.lore) {
    lines.push({ kind: 'styled', spans: line });
  }

  return lines;
}

function styleOf(span: TextSpan): AnsiState {
  return {
    color: span.color ? nearestAnsiCode(span.color) : undefined,
    bold: Boolean(span.bold),
    underlined: Boolean(span.underlined),
  };
}

function isDefault(state: AnsiState): boolean {
  return state.color === undefined && !state.bold && !state.underlined;
}

function transitionCodes(from: AnsiState, to: AnsiState): number[] {
  const turnsOff =
    (from.color !== undefined && to.color === undefined) ||
    (from.bold && !to.bold) ||
    (from.underlined && !to.underlined);

  if (turnsOff) {
    const codes = [0];
    if (to.color !== undefined) codes.push(to.color);
    if (to.bold) codes.push(1);
    if (to.underlined) codes.push(4);
    return codes;
  }

  const codes: number[] = [];
  if (to.color !== undefined && to.color !== from.color) {
    codes.push(to.color);
  }
  if (to.bold && !from.bold) {
    codes.push(1);
  }
  if (to.underlined && !from.underlined) {
    codes.push(4);
  }
  return codes;
}

function nearestAnsiCode(hex: string): number | undefined {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) {
    return undefined;
  }

  const target = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

  let nearest: (typeof ANSI_PALETTE)[number] = ANSI_PALETTE[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const color of ANSI_PALETTE) {
    const distance =
      (color.rgb[0] - target[0]) ** 2 + (color.rgb[1] - target[1]) ** 2 + (color.rgb[2] - target[2]) ** 2;
    if (distance < nearestDistance) {
      nearest = color;
      nearestDistance = distance;
    }
  }

  return nearest.code;
}
