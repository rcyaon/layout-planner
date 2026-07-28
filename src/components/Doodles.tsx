/**
 * Loose, hand-drawn squiggles that peek out from behind the app card.
 * Only a thin band around the card is visible, so every shape is placed so a
 * recognisable sliver of it pokes past an edge or corner.
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
  /** loop-the-loop */
  loop: { d: 'M22 36 C 2 34, 2 8, 24 8 C 44 8, 42 30, 22 30 C 34 40, 52 32, 62 18', vb: '0 0 66 44', sw: 3 },
  /** springy corkscrew */
  spring: {
    d: 'M4 18 C 4 4 18 4 18 18 C 18 32 32 32 32 18 C 32 4 46 4 46 18 C 46 32 60 32 60 18 C 60 4 74 4 74 18',
    vb: '0 0 78 36',
    sw: 3,
  },
  /** wobbly squiggle with uneven amplitude */
  squiggle: { d: 'M2 20 C 8 4, 16 4, 20 20 S 32 36, 38 20 S 52 2, 58 20 S 72 36, 78 20', vb: '0 0 82 40', sw: 3 },
  /** curl that tucks into itself */
  curl: { d: 'M44 8 C 20 2, 4 16, 10 29 C 16 40, 35 39, 34 26 C 33 17, 21 15, 19 25', vb: '0 0 48 44', sw: 2.8 },
  /** open spiral */
  swirl: { d: 'M30 30 C 30 24 22 24 22 30 C 22 38 34 38 34 28 C 34 16 18 16 18 30 C 18 46 40 46 40 27', vb: '0 0 48 52', sw: 2.8 },
  /** puffy cloud */
  cloud: {
    d: 'M9 31 C 0 30 1 18 11 18 C 11 6 27 4 30 14 C 42 8 52 18 46 26 C 52 35 43 41 36 34 C 30 43 14 41 9 31 Z',
    vb: '0 0 56 46',
    sw: 2.8,
  },
  /** wobbly blob */
  blob: { d: 'M24 4 C 36 2 45 12 42 22 C 39 34 30 43 20 40 C 8 37 2 28 6 18 C 9 10 16 6 24 4 Z', vb: '0 0 48 46', sw: 2.8 },
  /** four-point sparkle drawn with curves */
  sparkle: { d: 'M20 2 C 22 14 26 18 38 20 C 26 22 22 26 20 38 C 18 26 14 22 2 20 C 14 18 18 14 20 2 Z', vb: '0 0 40 40', sw: 2.6 },
  /** bouncing arcs */
  bounce: { d: 'M2 30 Q 10 3 18 30 T 34 30 T 50 30 T 66 30', vb: '0 0 70 36', sw: 2.8 },
  /** loose scribble */
  tangle: { d: 'M4 28 C 16 3, 30 44, 42 20 C 50 4, 57 35, 66 19', vb: '0 0 70 40', sw: 2.8 },
  /** ripples */
  ripple: { d: 'M6 36 A30 30 0 0 1 36 6 M16 36 A20 20 0 0 1 36 16 M26 36 A10 10 0 0 1 36 26', vb: '0 0 40 40', sw: 2.6 },
  /** curly arrow */
  arrow: { d: 'M4 32 C 12 8 32 4 46 17 M37 9 C 42 12 45 15 46 17 C 44 20 41 23 39 26', vb: '0 0 52 38', sw: 2.6 },
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
  { shape: 'sparkle', className: 'absolute -top-1 left-1/3 w-12 rotate-12', color: DUSTY },
  { shape: 'spring', className: 'absolute top-0 left-1/2 w-32 rotate-2' },
  { shape: 'cloud', className: 'absolute -top-2 right-1/3 w-20 -rotate-6', color: FOREST },
  { shape: 'curl', className: 'absolute top-0 right-24 w-16 rotate-12' },
  { shape: 'bounce', className: 'absolute top-0 right-8 w-24 rotate-3', color: BRICK },

  // left edge
  { shape: 'swirl', className: 'absolute top-20 -left-3 w-20 rotate-90' },
  { shape: 'blob', className: 'absolute top-1/3 -left-2 w-16 rotate-90', color: DUSTY },
  { shape: 'loop', className: 'absolute top-1/2 -left-4 w-24 rotate-90' },
  { shape: 'tangle', className: 'absolute bottom-1/4 -left-3 w-24 rotate-90', color: BRICK },
  { shape: 'coil', className: 'absolute bottom-24 -left-4 w-28 rotate-90' },

  // right edge
  { shape: 'curl', className: 'absolute top-24 -right-3 w-20 rotate-90', color: FOREST },
  { shape: 'squiggle', className: 'absolute top-1/2 -right-4 w-28 rotate-90' },
  { shape: 'ripple', className: 'absolute bottom-1/3 -right-3 w-16 rotate-90', color: DUSTY },
  { shape: 'swirl', className: 'absolute bottom-16 -right-3 w-16 rotate-90' },

  // bottom edge
  { shape: 'ripple', className: 'absolute bottom-0 left-10 w-16 rotate-180', color: FOREST },
  { shape: 'arrow', className: 'absolute bottom-0 left-1/4 w-24 rotate-180' },
  { shape: 'sparkle', className: 'absolute -bottom-1 left-1/2 w-12 -rotate-6', color: BRICK },
  { shape: 'blob', className: 'absolute bottom-0 right-1/3 w-16 rotate-180' },
  { shape: 'wave', className: 'absolute bottom-0 right-16 w-32 rotate-3' },
  { shape: 'curl', className: 'absolute bottom-1 right-10 w-14 -rotate-12', color: DUSTY },
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
