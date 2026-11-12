import type { TextSpan } from '@/lib/minecraft/item-components/text';
import { groupAttributes, type ItemPresentation } from '@/lib/minecraft/item/presentation';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import satori from 'satori';
import sharp from 'sharp';

interface SatoriElement {
  type: 'div' | 'span';
  props: {
    style: Record<string, unknown>;
    children?: SatoriChild | SatoriChild[];
  };
}

type SatoriChild = SatoriElement | string;

/** One rendered line of the tooltip. */
interface TooltipLine {
  spans: TextSpan[];
  /** Color used by spans that do not define their own color. */
  color: string;
  marginTop: number;
  paddingLeft: number;
  fontSize?: number;
}

const WIDTH = 1200;
const HEIGHT = 630;
const PADDING_X = 56;
const PADDING_Y = 44;
const BORDER = 4;
const PANEL_WIDTH = WIDTH - PADDING_X * 2 - BORDER * 2;
const BODY_SIZE = 34;
const NAME_SIZE = 48;
const LINE_HEIGHT = 1.35;
const GROUP_GAP = 34;
const INDENT = 34;
const MAX_PANEL_HEIGHT = HEIGHT - PADDING_Y * 2 - BORDER * 2;
/** Long lore is truncated so the tooltip stays readable when scaled down. */
const MAX_LORE_LINES = 8;

const GRAY = '#AAAAAA';
const BLUE = '#5555FF';

const require = createRequire(import.meta.url);
const FONT_PATH = require.resolve('@expo-google-fonts/dotgothic16/400Regular/DotGothic16_400Regular.ttf');

let fontData: Promise<Buffer> | undefined;

function loadFont(): Promise<Buffer> {
  fontData ??= readFile(FONT_PATH);
  return fontData;
}

/** Render a tooltip for an item as a 1200x630 PNG for social previews. */
export async function renderItemOgImage(presentation: ItemPresentation): Promise<Buffer> {
  const font = await loadFont();
  const fonts = [
    { name: 'DotGothic16', data: font, weight: 400 as const, style: 'normal' as const },
    { name: 'DotGothic16', data: font, weight: 700 as const, style: 'normal' as const },
  ];

  const content = buildContent(presentation);
  const measured = await satori(content as never, { width: PANEL_WIDTH, fonts });
  const naturalHeight = svgHeight(measured) ?? MAX_PANEL_HEIGHT;
  const scale = Math.min(1, MAX_PANEL_HEIGHT / naturalHeight);

  const scene = buildScene(content, scale);
  const svg = await satori(scene as never, { width: WIDTH, height: HEIGHT, fonts });

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** The tooltip itself covers the whole image, with its content centered. */
function buildScene(content: SatoriElement, scale: number): SatoriElement {
  return div(
    {
      display: 'flex',
      flexDirection: 'column',
      width: `${WIDTH}px`,
      height: `${HEIGHT}px`,
      boxSizing: 'border-box',
      padding: `${PADDING_Y}px ${PADDING_X}px`,
      backgroundColor: '#111827',
      border: `${BORDER}px solid #4C1D95`,
      justifyContent: 'center',
    },
    [
      div(
        {
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          transform: `scale(${scale})`,
        },
        content.props.children as SatoriChild[],
      ),
    ],
  );
}

function buildContent(presentation: ItemPresentation): SatoriElement {
  return div(
    {
      display: 'flex',
      flexDirection: 'column',
      width: `${PANEL_WIDTH}px`,
    },
    buildLines(presentation).map(renderLine),
  );
}

function buildLines(presentation: ItemPresentation): TooltipLine[] {
  const lines: TooltipLine[] = [];

  lines.push({ spans: presentation.name, color: '#FFFFFF', marginTop: 0, paddingLeft: 0, fontSize: NAME_SIZE });

  // Firework tooltip block.
  if (presentation.firework) {
    const block: TooltipLine[] = [];
    block.push(plainLine(presentation.firework.flightText, GRAY));

    presentation.firework.explosions.forEach((explosion, index) => {
      const label = `${explosion.shape}${explosion.count > 1 ? ` x ${explosion.count}` : ''}`;
      block.push(plainLine(label, GRAY, { marginTop: index === 0 ? 0 : 14 }));

      for (const color of explosion.colors) {
        block.push(plainLine(color.name ?? color.hex, GRAY, { paddingLeft: INDENT }));
      }

      if (explosion.fadeColors.length > 0) {
        const fade = `${explosion.fadeLabel}${explosion.fadeColors.map((color) => color.name ?? color.hex).join(' ')}`;
        block.push(plainLine(fade, GRAY, { paddingLeft: INDENT }));
      }

      for (const effect of explosion.effects) {
        block.push(plainLine(effect, GRAY, { paddingLeft: INDENT }));
      }
    });

    addBlock(lines, block);
  }

  addBlock(
    lines,
    presentation.enchantments.map((row) => plainLine(`${row.name} ${row.levelLabel}`.trimEnd(), GRAY)),
  );

  addBlock(
    lines,
    presentation.potions.map((row) =>
      plainLine([row.name, row.levelLabel, row.duration && `(${row.duration})`].filter(Boolean).join(' '), BLUE),
    ),
  );

  addBlock(
    lines,
    presentation.extras.filter((extra) => !extra.afterLore).map((extra) => plainLine(extra.text, BLUE)),
  );

  // Shield banner block.
  if (presentation.banner) {
    const block: TooltipLine[] = [];

    if (presentation.banner.baseColor) {
      block.push(plainLine(`${presentation.banner.baseColorLabel} ${presentation.banner.baseColor}`, BLUE));
    }

    if (presentation.banner.patterns.length > 0) {
      block.push(plainLine(presentation.banner.patternsLabel, GRAY));
      for (const pattern of presentation.banner.patterns) {
        block.push(plainLine(pattern.text, BLUE, { paddingLeft: INDENT }));
      }
    }

    addBlock(lines, block);
  }

  // Lore, capped so long items stay legible.
  const loreLines = presentation.lore.filter((line) => line.some((span) => span.text.trim() !== ''));
  const visibleLore = loreLines.slice(0, MAX_LORE_LINES);
  addBlock(
    lines,
    visibleLore.map((spans) => ({ spans, color: '#FFFFFF', marginTop: 0, paddingLeft: 0 })),
  );
  if (loreLines.length > MAX_LORE_LINES) {
    lines.push(plainLine('…', GRAY));
  }

  const attributeBlock: TooltipLine[] = [];
  for (const group of groupAttributes(presentation.attributes)) {
    attributeBlock.push(plainLine(group.header, GRAY));
    for (const row of group.rows) {
      attributeBlock.push(plainLine(row.text, BLUE));
    }
  }
  addBlock(lines, attributeBlock);

  addBlock(
    lines,
    presentation.extras.filter((extra) => extra.afterLore).map((extra) => plainLine(extra.text, BLUE)),
  );

  return lines;
}

function addBlock(lines: TooltipLine[], block: TooltipLine[]): void {
  if (block.length === 0) {
    return;
  }
  block[0].marginTop += GROUP_GAP;
  lines.push(...block);
}

interface LineOptions {
  marginTop?: number;
  paddingLeft?: number;
}

function plainLine(text: string, color: string, options: LineOptions = {}): TooltipLine {
  return {
    spans: [{ text }],
    color,
    marginTop: options.marginTop ?? 0,
    paddingLeft: options.paddingLeft ?? 0,
  };
}

function renderLine(line: TooltipLine): SatoriElement {
  return div(
    {
      color: line.color,
      fontSize: `${line.fontSize ?? BODY_SIZE}px`,
      lineHeight: LINE_HEIGHT,
      marginTop: `${line.marginTop}px`,
      paddingLeft: `${line.paddingLeft}px`,
      overflowWrap: 'break-word',
    },
    line.spans.map(renderSpan),
  );
}

function renderSpan(span: TextSpan): SatoriElement {
  const style: Record<string, unknown> = {};

  if (span.color) {
    style.color = span.color;
  }
  if (span.bold) {
    style.fontWeight = 700;
  }

  const decorations = [span.underlined && 'underline', span.strikethrough && 'line-through'].filter(Boolean);
  if (decorations.length > 0) {
    style.textDecoration = decorations.join(' ');
  }

  return spanElement(style, span.text);
}

function div(style: Record<string, unknown>, children?: SatoriChild | SatoriChild[]): SatoriElement {
  return { type: 'div', props: { style, children } };
}

function spanElement(style: Record<string, unknown>, text: string): SatoriElement {
  return { type: 'span', props: { style, children: text } };
}

function svgHeight(svg: string): number | undefined {
  const match = /^<svg[^>]*\bheight="([\d.]+)"/.exec(svg);
  return match ? Number(match[1]) : undefined;
}
