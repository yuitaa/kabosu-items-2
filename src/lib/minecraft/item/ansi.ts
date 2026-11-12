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

/**
 * Render spans as ANSI escapes. Every span starts with a reset so inherited
 * styles from the previous span cannot leak into it.
 */
export function textSpansToAnsi(spans: readonly TextSpan[]): string {
  const text = spans.map((span) => `${RESET}${styleCodes(span)}${span.text}`).join('');
  return `${text}${RESET}`;
}

/** Build the `ansi` fenced code block that can be pasted into Discord. */
export function buildDiscordAnsi(presentation: ItemPresentation): string {
  const lines: string[] = [textSpansToAnsi(presentation.name)];

  if (presentation.enchantments.length > 0) {
    lines.push('エンチャント');
    for (const row of presentation.enchantments) {
      lines.push(` - ${row.name} ${row.levelLabel}`.trimEnd());
    }
  }

  if (presentation.attributes.length > 0) {
    lines.push('追加効果');
    for (const group of groupAttributes(presentation.attributes)) {
      lines.push(` - ${group.header}`);
      for (const row of group.rows) {
        lines.push(`   - ${row.text}`);
      }
    }
  }

  if (presentation.potions.length > 0) {
    lines.push('ポーション効果');
    for (const row of presentation.potions) {
      const detail = [row.name, row.levelLabel, row.duration && `(${row.duration})`].filter(Boolean).join(' ');
      lines.push(` - ${detail}`);
    }
  }

  if (presentation.firework) {
    lines.push(presentation.firework.flightText);
    for (const explosion of presentation.firework.explosions) {
      const count = explosion.count > 1 ? ` x ${explosion.count}` : '';
      lines.push(` - ${explosion.shape}${count}`);
      for (const color of explosion.colors) {
        lines.push(`   - ${color.name ?? color.hex}`);
      }
      if (explosion.fadeColors.length > 0) {
        const colors = explosion.fadeColors.map((color) => color.name ?? color.hex).join(' ');
        lines.push(`   - ${explosion.fadeLabel}${colors}`);
      }
      for (const effect of explosion.effects) {
        lines.push(`   - ${effect}`);
      }
    }
  }

  if (presentation.banner) {
    if (presentation.banner.baseColor) {
      lines.push(` - ${presentation.banner.baseColorLabel} ${presentation.banner.baseColor}`);
    }
    if (presentation.banner.patterns.length > 0) {
      lines.push(` - ${presentation.banner.patternsLabel}`);
      for (const pattern of presentation.banner.patterns) {
        lines.push(`   - ${pattern.text}`);
      }
    }
  }

  for (const extra of presentation.extras) {
    lines.push(` - ${extra.text}`);
  }

  for (const line of presentation.lore) {
    lines.push(textSpansToAnsi(line));
  }

  return ['```ansi', lines.join('\n'), `${RESET}\`\`\``].join('\n');
}

function styleCodes(span: TextSpan): string {
  const codes: number[] = [];

  if (span.color) {
    const code = nearestAnsiCode(span.color);
    if (code !== undefined) {
      codes.push(code);
    }
  }
  if (span.bold) {
    codes.push(1);
  }
  if (span.underlined) {
    codes.push(4);
  }

  return codes.length > 0 ? `${ESC}[${codes.join(';')}m` : '';
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
