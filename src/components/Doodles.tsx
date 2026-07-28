/**
 * Loose, hand-drawn squiggles that peek out from behind the app card.
 * Only a thin band around the card is visible, so every shape is placed so a
 * recognisable sliver of it pokes past an edge or corner.
 *
 * Every shape here is an open squiggly line — no closed blobs, clouds or
 * sparkles — so the border band reads as one continuous scribbled frame.
 */

interface Shape {
  /** Path data — curves only, so everything reads as hand-drawn. */
  d: string;
  vb: string;
  /** Stroke width in viewBox units, tuned so every doodle reads the same weight. */
  sw: number;
}

const SHAPES = {
  /** long rolling wave */
  wave: { d: 'M2 16 C 14 2, 24 2, 28 16 S 50 30, 58 16 S 84 3, 98 16', vb: '0 0 100 32', sw: 3.2 },
  /** shallow bumps */
  coil: { d: 'M2 12 Q 18 -4 32 12 T 64 12 T 96 12', vb: '0 0 100 24', sw: 3.2 },
  /** springy corkscrew */
  spring: {
    d: 'M4 18 C 4 4 18 4 18 18 C 18 32 32 32 32 18 C 32 4 46 4 46 18 C 46 32 60 32 60 18 C 60 4 74 4 74 18',
    vb: '0 0 78 36',
    sw: 3,
  },
  /** wobbly squiggle with uneven amplitude */
  squiggle: { d: 'M2 20 C 8 4, 16 4, 20 20 S 32 36, 38 20 S 52 2, 58 20 S 72 36, 78 20', vb: '0 0 82 40', sw: 3 },
  /** bouncing arcs */
  bounce: { d: 'M2 30 Q 10 3 18 30 T 34 30 T 50 30 T 66 30', vb: '0 0 70 36', sw: 2.8 },
  /** loose scribble that wanders off its baseline */
  tangle: { d: 'M4 28 C 16 3, 30 44, 42 20 C 50 4, 57 35, 66 19', vb: '0 0 70 40', sw: 2.8 },
  /** tight, fast little ripples */
  ripple: {
    d: 'M2 10 C 5 2, 9 2, 12 10 S 19 18, 22 10 S 29 2, 32 10 S 39 18, 42 10 S 49 2, 52 10 S 59 18, 62 10',
    vb: '0 0 64 20',
    sw: 2.6,
  },
  /** long, lazy, low-amplitude drift */
  lazy: { d: 'M2 14 C 20 4, 34 24, 52 14 S 84 4, 98 14', vb: '0 0 100 28', sw: 3 },
  /** curvy zigzag with squared-off shoulders */
  zip: {
    d: 'M2 26 C 8 26, 8 6, 14 6 S 20 26, 26 26 S 32 6, 38 6 S 44 26, 50 26 S 56 6, 62 6',
    vb: '0 0 64 32',
    sw: 2.8,
  },
  /** squiggle whose swing grows as it travels */
  swell: { d: 'M2 18 C 6 14, 10 14, 14 18 S 22 26, 27 18 S 37 6, 44 18 S 56 32, 64 18 S 80 2, 94 18', vb: '0 0 98 36', sw: 2.8 },
  /** two squiggles running in parallel */
  twin: {
    d: 'M2 9 Q 12 -1 22 9 T 42 9 T 62 9 M2 23 Q 12 13 22 23 T 42 23 T 62 23',
    vb: '0 0 64 32',
    sw: 2.6,
  },
  /** wobble that doubles back on itself */
  knot: { d: 'M2 22 C 12 2, 22 2, 26 16 C 30 30, 40 30, 44 16 C 48 2, 58 4, 62 20', vb: '0 0 66 34', sw: 2.8 },
} satisfies Record<string, Shape>;

const GOLD = '#f2c94c';
const BRICK = '#c2705f';
const FOREST = '#6f9c7c';
const DUSTY = '#7f92c4';

interface Doodle {
  shape: keyof typeof SHAPES;
  /** Position + size + rotation. */
  className: string;
  color?: string;
}

/** Scattered around all four edges so no side of the card looks bare. */
const DOODLES: Doodle[] = [
  // top edge
  { shape: 'wave', className: 'absolute top-0 left-16 w-32 -rotate-3' },
  { shape: 'ripple', className: 'absolute -top-1 left-1/3 w-20 rotate-6', color: DUSTY },
  { shape: 'spring', className: 'absolute top-0 left-1/2 w-32 rotate-2' },
  { shape: 'twin', className: 'absolute -top-2 right-1/3 w-24 -rotate-3', color: FOREST },
  { shape: 'knot', className: 'absolute top-0 right-24 w-20 rotate-6' },
  { shape: 'bounce', className: 'absolute top-0 right-8 w-24 rotate-3', color: BRICK },

  // left edge
  { shape: 'zip', className: 'absolute top-20 -left-3 w-20 rotate-90' },
  { shape: 'ripple', className: 'absolute top-1/3 -left-2 w-20 rotate-90', color: DUSTY },
  { shape: 'swell', className: 'absolute top-1/2 -left-6 w-28 rotate-90' },
  { shape: 'tangle', className: 'absolute bottom-1/4 -left-3 w-24 rotate-90', color: BRICK },
  { shape: 'coil', className: 'absolute bottom-24 -left-4 w-28 rotate-90' },

  // right edge
  { shape: 'knot', className: 'absolute top-24 -right-3 w-20 rotate-90', color: FOREST },
  { shape: 'squiggle', className: 'absolute top-1/2 -right-4 w-28 rotate-90' },
  { shape: 'twin', className: 'absolute bottom-1/3 -right-3 w-20 rotate-90', color: DUSTY },
  { shape: 'zip', className: 'absolute bottom-16 -right-3 w-16 rotate-90' },

  // bottom edge
  { shape: 'lazy', className: 'absolute bottom-0 left-10 w-28 rotate-180', color: FOREST },
  { shape: 'bounce', className: 'absolute bottom-0 left-1/4 w-24 rotate-180' },
  { shape: 'ripple', className: 'absolute -bottom-1 left-1/2 w-20 -rotate-3', color: BRICK },
  { shape: 'swell', className: 'absolute bottom-0 right-1/3 w-24 rotate-180' },
  { shape: 'wave', className: 'absolute bottom-0 right-16 w-32 rotate-3' },
  { shape: 'coil', className: 'absolute bottom-1 right-10 w-20 -rotate-6', color: DUSTY },
];

function Squig({ shape, className, color = GOLD }: Doodle) {
  const { d, vb, sw } = SHAPES[shape];
  return (
    <svg
      className={className}
      viewBox={vb}
      fill="none"
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

export default function Doodles() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {DOODLES.map((dd, i) => (
        <Squig key={i} {...dd} />
      ))}
    </div>
  );
}
