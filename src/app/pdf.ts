/**
 * SportFlow — Professional Tournament Fixtures PDF generator.
 *
 * Built exclusively with pdfmake (no html2canvas, no jsPDF, no autoTable, no tables).
 *
 * Design language: Linear / Notion / GitHub / Vercel / Apple — minimalist, generous
 * whitespace, clean typography, soft rounded cards. Every round is rendered as a card
 * drawn on a single canvas (card body + dark header bar + accent "VS" capsules); all
 * text is overlaid using out-of-flow relative positioning so cards keep a constant,
 * predictable geometry and never split across pages.
 */

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type {
  CanvasElement,
  Content,
  ContentCanvas,
  ContentColumns,
  ContentText,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';

(pdfMake as unknown as { vfs: typeof pdfFonts.vfs }).vfs = pdfFonts.vfs;

/** A sized text cell living inside a `columns` container. */
type SizedText = ContentText & { width: number };

/**
 * A `columns` block taken out of the normal flow and stamped at an absolute
 * offset from its origin. Wrapping the text in a fixed-width column is what makes
 * `alignment` reliable: pdfmake aligns against the column's width, whereas a bare
 * positioned text would align against the (much wider) page `availableWidth`.
 */
type OverlayBlock = ContentColumns & { relativePosition: { x: number; y: number } };

/** A flow item that occupies a sized column inside a `columns` row. */
type ColumnContent = Content & { width: number };

/* ------------------------------------------------------------------ *
 * Domain model
 * ------------------------------------------------------------------ */

export interface Match {
  readonly homeTeam: string;
  readonly awayTeam: string;
}

export type Round = readonly Match[];

/* ------------------------------------------------------------------ *
 * Brand palette
 * ------------------------------------------------------------------ */

const COLOR = {
  PRIMARY: '#111827',
  ACCENT: '#C7D62E',
  TEXT: '#374151',
  LIGHT: '#F9FAFB',
  BORDER: '#E5E7EB',
  MUTED: '#9CA3AF',
  WHITE: '#FFFFFF',
} as const;

/* ------------------------------------------------------------------ *
 * Page & layout constants (points). No magic numbers scattered around.
 * ------------------------------------------------------------------ */

const PAGE = {
  /** A4 landscape, in points. */
  WIDTH: 841.89,
  HEIGHT: 595.28,
  MARGIN_X: 28,
  MARGIN_TOP: 66,
  MARGIN_BOTTOM: 38,
} as const;

const CARD = {
  RADIUS: 8,
  PAD: 9,
  /** header bar height = fontSize + HEADER_EXTRA. */
  HEADER_EXTRA: 13,
  /** match row height = fontSize + ROW_EXTRA. */
  ROW_EXTRA: 9,
  TOP_GAP: 7,
  BOTTOM_PAD: 9,
  /** "VS" capsule = fontSize + these. */
  CAPSULE_EXTRA_W: 16,
  CAPSULE_EXTRA_H: 5,
  /** gap between a team zone and the central VS capsule. */
  MID_GAP: 6,
} as const;

const GRID = {
  COLUMN_GAP: 10,
  ROW_GAP: 12,
} as const;

/* ------------------------------------------------------------------ *
 * Resolved layout for a given set of rounds.
 * ------------------------------------------------------------------ */

interface LayoutConfig {
  readonly columns: number;
  readonly fontSize: number;
  readonly cardWidth: number;
  readonly cardHeight: number;
  readonly headerHeight: number;
  readonly matchRowHeight: number;
  readonly columnGap: number;
  readonly rowGap: number;
  readonly maxMatches: number;
}

/* ------------------------------------------------------------------ *
 * Pure layout math — single responsibility, no rendering here.
 * ------------------------------------------------------------------ */

/** Columns per row, driven purely by the number of rounds. */
function resolveColumns(roundCount: number): number {
  if (roundCount <= 4) return 2; // 1–4  → 2 columns
  if (roundCount <= 20) return 4; // 5–20 → 4 columns
  return 3; //                      21+  → 3 columns
}

/** Adaptive font size so the document is always legible. */
function resolveFontSize(roundCount: number): number {
  if (roundCount <= 8) return 10;
  if (roundCount <= 24) return 9;
  return 8;
}

/** Largest number of matches found in any round (drives card height). */
function resolveMaxMatches(fixtures: readonly Round[]): number {
  return fixtures.reduce((max, round) => Math.max(max, round.length), 1);
}

/**
 * Computes every responsive dimension from the fixtures alone — no fixed sizes.
 * Card width fills the printable area; card height is derived from the busiest round.
 */
function calculateLayout(fixtures: readonly Round[]): LayoutConfig {
  const roundCount = fixtures.length;
  const columns = resolveColumns(roundCount);
  const fontSize = resolveFontSize(roundCount);
  const maxMatches = resolveMaxMatches(fixtures);

  const printableWidth = PAGE.WIDTH - PAGE.MARGIN_X * 2;
  const cardWidth =
    (printableWidth - (columns - 1) * GRID.COLUMN_GAP) / columns;

  const headerHeight = fontSize + CARD.HEADER_EXTRA;
  const matchRowHeight = fontSize + CARD.ROW_EXTRA;
  const cardHeight =
    headerHeight + CARD.TOP_GAP + maxMatches * matchRowHeight + CARD.BOTTOM_PAD;

  return {
    columns,
    fontSize,
    cardWidth,
    cardHeight,
    headerHeight,
    matchRowHeight,
    columnGap: GRID.COLUMN_GAP,
    rowGap: GRID.ROW_GAP,
    maxMatches,
  };
}

/* ------------------------------------------------------------------ *
 * Card geometry — derived per card from the resolved layout.
 * ------------------------------------------------------------------ */

interface CardGeometry {
  readonly width: number;
  readonly height: number;
  readonly fontSize: number;
  readonly headerHeight: number;
  readonly matchRowHeight: number;
  readonly capsuleWidth: number;
  readonly capsuleHeight: number;
  readonly capsuleX: number;
  readonly homeZoneX: number;
  readonly homeZoneWidth: number;
  readonly awayZoneX: number;
  readonly awayZoneWidth: number;
}

function buildCardGeometry(layout: LayoutConfig): CardGeometry {
  const { cardWidth: width, fontSize } = layout;

  const capsuleWidth = fontSize + CARD.CAPSULE_EXTRA_W;
  const capsuleHeight = fontSize + CARD.CAPSULE_EXTRA_H;
  const capsuleX = (width - capsuleWidth) / 2;

  const homeZoneX = CARD.PAD;
  const homeZoneWidth = capsuleX - CARD.MID_GAP - CARD.PAD;

  const awayZoneX = capsuleX + capsuleWidth + CARD.MID_GAP;
  const awayZoneWidth = width - CARD.PAD - awayZoneX;

  return {
    width,
    height: layout.cardHeight,
    fontSize,
    headerHeight: layout.headerHeight,
    matchRowHeight: layout.matchRowHeight,
    capsuleWidth,
    capsuleHeight,
    capsuleX,
    homeZoneX,
    homeZoneWidth,
    awayZoneX,
    awayZoneWidth,
  };
}

/** Top (y) of a given match row inside the card. */
function rowTop(geo: CardGeometry, index: number): number {
  return geo.headerHeight + CARD.TOP_GAP + index * geo.matchRowHeight;
}

/* ------------------------------------------------------------------ *
 * Canvas chrome — all the shapes of one card in a single canvas node.
 * ------------------------------------------------------------------ */

function buildCardCanvas(geo: CardGeometry, round: Round): ContentCanvas {
  const shapes: CanvasElement[] = [];

  // Card body: white, soft rounded border.
  shapes.push({
    type: 'rect',
    x: 0,
    y: 0,
    w: geo.width,
    h: geo.height,
    r: CARD.RADIUS,
    color: COLOR.WHITE,
    lineWidth: 1,
    lineColor: COLOR.BORDER,
  });

  // Dark header bar: rounded at the top, squared where it meets the body.
  shapes.push({
    type: 'rect',
    x: 0,
    y: 0,
    w: geo.width,
    h: geo.headerHeight,
    r: CARD.RADIUS,
    color: COLOR.PRIMARY,
  });
  shapes.push({
    type: 'rect',
    x: 0,
    y: geo.headerHeight - CARD.RADIUS,
    w: geo.width,
    h: CARD.RADIUS,
    color: COLOR.PRIMARY,
  });

  // Accent "VS" capsules, one per match.
  round.forEach((_, index) => {
    const top = rowTop(geo, index);
    shapes.push({
      type: 'rect',
      x: geo.capsuleX,
      y: top + (geo.matchRowHeight - geo.capsuleHeight) / 2,
      w: geo.capsuleWidth,
      h: geo.capsuleHeight,
      r: geo.capsuleHeight / 2,
      color: COLOR.ACCENT,
    });
  });

  return { canvas: shapes };
}

/* ------------------------------------------------------------------ *
 * Text overlays — positioned out of flow so card geometry stays fixed.
 * ------------------------------------------------------------------ */

/**
 * Out-of-flow text positioned relative to the card's top-left corner. The text is
 * wrapped in a fixed-width column so its `alignment` resolves against `width`.
 */
function overlay(
  geo: CardGeometry,
  text: string,
  x: number,
  yInCard: number,
  width: number,
  options: Partial<ContentText>,
): OverlayBlock {
  const cell: SizedText = { text, width, ...options };
  return {
    relativePosition: { x, y: yInCard - geo.height },
    columns: [cell],
  };
}

function buildRoundTitle(geo: CardGeometry, index: number): OverlayBlock {
  const titleY = (geo.headerHeight - geo.fontSize) / 2 - 0.5;
  return overlay(geo, `ROUND ${index + 1}`, CARD.PAD, titleY, geo.width - CARD.PAD * 2, {
    fontSize: geo.fontSize,
    bold: true,
    color: COLOR.WHITE,
    characterSpacing: 0.6,
  });
}

function buildMatch(
  geo: CardGeometry,
  match: Match,
  index: number,
): OverlayBlock[] {
  const top = rowTop(geo, index);
  const textY = top + (geo.matchRowHeight - geo.fontSize) / 2 - 0.5;

  const home = overlay(geo, match.homeTeam, geo.homeZoneX, textY, geo.homeZoneWidth, {
    fontSize: geo.fontSize,
    color: COLOR.TEXT,
    alignment: 'right',
  });

  const vs = overlay(geo, 'VS', geo.capsuleX, textY, geo.capsuleWidth, {
    fontSize: geo.fontSize - 1,
    bold: true,
    color: COLOR.PRIMARY,
    alignment: 'center',
  });

  const away = overlay(geo, match.awayTeam, geo.awayZoneX, textY, geo.awayZoneWidth, {
    fontSize: geo.fontSize,
    color: COLOR.TEXT,
    alignment: 'left',
  });

  return [home, vs, away];
}

/* ------------------------------------------------------------------ *
 * Card assembly
 * ------------------------------------------------------------------ */

function buildRoundCard(
  round: Round,
  index: number,
  layout: LayoutConfig,
): ColumnContent {
  const geo = buildCardGeometry(layout);

  const overlays: OverlayBlock[] = [buildRoundTitle(geo, index)];
  round.forEach((match, matchIndex) => {
    overlays.push(...buildMatch(geo, match, matchIndex));
  });

  // The canvas reserves the card's box/height; overlays sit on top, out of flow.
  return {
    width: geo.width,
    stack: [buildCardCanvas(geo, round), ...overlays],
  };
}

/* ------------------------------------------------------------------ *
 * Pagination — group cards into rows. Rows flow naturally onto new pages,
 * and because every card is a single atomic canvas, a round never splits.
 * ------------------------------------------------------------------ */

function paginate(cards: readonly Content[], layout: LayoutConfig): Content[] {
  const rows: Content[] = [];

  for (let i = 0; i < cards.length; i += layout.columns) {
    const slice = cards.slice(i, i + layout.columns);
    const row: ContentColumns = {
      columns: slice,
      columnGap: layout.columnGap,
      margin: [0, 0, 0, layout.rowGap],
    };
    rows.push(row);
  }

  return rows;
}

function buildBody(fixtures: readonly Round[], layout: LayoutConfig): Content[] {
  const cards = fixtures.map((round, index) =>
    buildRoundCard(round, index, layout),
  );
  return paginate(cards, layout);
}

/* ------------------------------------------------------------------ *
 * Header & footer
 * ------------------------------------------------------------------ */

function buildHeader(season: number | string, date: string): Content {
  return {
    columns: [
      {
        width: '*',
        stack: [
          { text: 'SportFlow', color: COLOR.PRIMARY, bold: true, fontSize: 18 },
          {
            canvas: [
              {
                type: 'line',
                x1: 0,
                y1: 3,
                x2: 56,
                y2: 3,
                lineWidth: 2.5,
                lineColor: COLOR.ACCENT,
              },
            ],
          },
          {
            text: 'Tournament Fixtures',
            color: COLOR.MUTED,
            fontSize: 9,
            margin: [0, 3, 0, 0],
          },
        ],
      },
      {
        width: 'auto',
        stack: [
          {
            text: `Season ${season}`,
            alignment: 'right',
            bold: true,
            color: COLOR.PRIMARY,
            fontSize: 11,
          },
          {
            text: date,
            alignment: 'right',
            color: COLOR.MUTED,
            fontSize: 9,
            margin: [0, 2, 0, 0],
          },
        ],
      },
    ],
    margin: [PAGE.MARGIN_X, 18, PAGE.MARGIN_X, 0],
  };
}

function buildFooter(currentPage: number, pageCount: number): Content {
  return {
    columns: [
      {
        text: 'Generated with SportFlow',
        color: COLOR.MUTED,
        fontSize: 8,
        margin: [PAGE.MARGIN_X, 0, 0, 0],
      },
      {
        text: `Página ${currentPage} de ${pageCount}`,
        alignment: 'right',
        color: COLOR.MUTED,
        fontSize: 8,
        margin: [0, 0, PAGE.MARGIN_X, 0],
      },
    ],
    margin: [0, 8, 0, 0],
  };
}

/* ------------------------------------------------------------------ *
 * Document assembly
 * ------------------------------------------------------------------ */

function buildDocument(
  fixtures: readonly Round[],
  season: number | string,
  date: string,
): TDocumentDefinitions {
  const layout = calculateLayout(fixtures);

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [
      PAGE.MARGIN_X,
      PAGE.MARGIN_TOP,
      PAGE.MARGIN_X,
      PAGE.MARGIN_BOTTOM,
    ],
    header: buildHeader(season, date),
    footer: (currentPage: number, pageCount: number) =>
      buildFooter(currentPage, pageCount),
    content: buildBody(fixtures, layout),
    defaultStyle: {
      font: 'Roboto',
      fontSize: layout.fontSize,
      color: COLOR.TEXT,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/**
 * Generates and downloads a professional, print-ready PDF of the tournament fixtures.
 *
 * @param fixtures Rounds, each holding its matches (home vs away).
 * @param season   Tournament season label (e.g. 2026).
 * @param date     Human-readable generation date.
 * @param fileName Download file name.
 */
export function generatePDFFixtures(
  fixtures: readonly Round[],
  season: number | string,
  date: string,
  fileName: string,
): void {
  if (!Array.isArray(fixtures) || fixtures.length === 0) {
    return;
  }

  const definition = buildDocument(fixtures, season, date);
  pdfMake.createPdf(definition).download(fileName);
}
