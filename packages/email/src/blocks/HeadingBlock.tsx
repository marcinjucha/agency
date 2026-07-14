import type { CSSProperties } from 'react'
import { Heading, Text } from '@react-email/components'
import type { HeadingBlock, BlockTypography } from './block-interfaces'

/**
 * HeadingBlock — v2 baked typography per level (AAA-T-221, 2026-05-15).
 *
 * v2 spec (claude-design email v2):
 *   .em-heading      { padding: 24px 24px 4px; margin: 0;
 *                      line-height: 1.3; letter-spacing: -0.01em; }
 *   .em-heading.h1   { font-size: 26px; font-weight: 700; }
 *   .em-heading.h2   { font-size: 20px; font-weight: 600; }
 *   .em-heading.h3   { font-size: 16px; font-weight: 600; }
 *
 * Merge order:
 *   1. style (BlockTypography mixin — gives textAlign + color)
 *   2. HEADING_STYLE_BY_LEVEL[level] — baked font-size/weight (wins over mixin defaults)
 *   3. layout (padding, margin, line-height, letter-spacing) — block-internal
 *
 * Color from mixin's `style.color` wins; legacy `block.color` is fallback for
 * pre-mixin JSONB rows.
 */

const HEADING_STYLE_BY_LEVEL: Record<HeadingBlock['level'], CSSProperties> = {
  h1: { fontSize: '26px', fontWeight: 700 },
  h2: { fontSize: '20px', fontWeight: 600 },
  h3: { fontSize: '16px', fontWeight: 600 },
  // eyebrow (Iter 3) — mała etykieta nadtytułowa ("TWOJE MATERIAŁY"):
  // uppercase + rozstrzelony letter-spacing + drobny rozmiar. Kolor domyślny
  // (muted) rozwiązywany w komponencie, nie tu (patrz EYEBROW_MUTED_COLOR).
  eyebrow: {
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
}

/**
 * Domyślny MUTED kolor eyebrow. Per-poziomowy default nie mieści się w
 * DEFAULT_BLOCK_TYPOGRAPHY (per-TYP, nie per-poziom), więc żyje tutaj:
 * gdy blok NIE niesie własnego textColor/textColorToken, eyebrow dostaje
 * muted zamiast ciemnego defaultu nagłówka. Jawny kolor usera zawsze wygrywa.
 */
const EYEBROW_MUTED_COLOR = '#64748b'

export function HeadingBlockComponent({
  block,
  style,
}: {
  block: HeadingBlock
  style?: CSSProperties
}) {
  const isEyebrow = block.level === 'eyebrow'
  const overrides = block as Partial<BlockTypography>
  // style.color zawsze przychodzi rozwiązane (drabinka w computeTypographyStyle
  // ma fallback), więc "brak jawnego koloru" wykrywamy z PÓL bloku.
  // ŚWIADOME odstępstwo od drabinki (token > hex > themed-default): eyebrow bez
  // JAWNEGO koloru na bloku ignoruje też themed-default nagłówka z mapy motywu —
  // etykieta ma być wyciszona (muted), nie w kolorze nagłówków motywu. Jawny
  // textColor/textColorToken na bloku nadal wygrywa.
  const hasExplicitColor = Boolean(overrides.textColor || overrides.textColorToken)
  const resolvedColor = isEyebrow && !hasExplicitColor
    ? EYEBROW_MUTED_COLOR
    : style?.color ?? block.color

  const merged: CSSProperties = {
    ...style, // textAlign + color from mixin
    ...HEADING_STYLE_BY_LEVEL[block.level], // baked font-size/weight per level
    color: resolvedColor,
    margin: 0,
    padding: '24px 24px 4px',
    lineHeight: 1.3,
    ...(isEyebrow ? {} : { letterSpacing: '-0.01em' }),
  }
  // eyebrow renderowany jako AKAPIT (<Text> → <p>), nie tag h* — semantycznie
  // to etykieta, nie nagłówek dokumentu (screen-readery / outline maila).
  if (block.level === 'eyebrow') {
    return <Text style={merged}>{block.text}</Text>
  }
  return (
    <Heading as={block.level} style={merged}>
      {block.text}
    </Heading>
  )
}
