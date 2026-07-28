/**
 * Loose, hand-drawn marks that peek out from behind the app card.
 * Only a thin band around the card is visible, so every shape is placed so a
 * recognisable sliver of it pokes past an edge or corner.
 *
 * All of them are drawn in the spirit of the underline beneath the "Layout
 * Planner" title: one long relaxed stroke with a soft undulation, not a tight
 * squiggle. Amplitude stays roughly a twentieth of the length so each mark
 * reads as a pen line that drifted, rather than a scribble.
 */

interface Shape {
  /** Path data — curves only, so everything reads as hand-drawn. */
  d: string;
  vb: string;
  /** Stroke width in viewBox units, tuned so every doodle reads the same weight. */
  sw: number;
}

const SHAPES = {
  /** the title underline itself — a long stroke that drifts twice */
  underline: { d: 'M2 7 C 22 3, 44 9, 64 6 S 100 4, 118 6.5', vb: '0 0 120 13', sw: 2.4 },
  /** one slow wave across the whole length */
  drift: { d: 'M2 6 C 30 2, 62 11, 90 6 S 112 4, 118 6.5', vb: '0 0 120 13', sw: 2.4 },
  /** a single shallow dip */
  dip: { d: 'M2 5 C 32 12, 72 12, 118 5', vb: '0 0 120 15', sw: 2.4 },
  /** a single shallow rise */
  rise: { d: 'M2 10 C 32 3, 72 3, 118 10', vb: '0 0 120 15', sw: 2.4 },
  /** nearly straight, just bowed off true */
  tilt: { d: 'M2 10 C 40 7, 80 5, 118 3.5', vb: '0 0 120 13', sw: 2.4 },
  /** wide, lazy arc */
  arc: { d: 'M2 13 C 32 3, 88 3, 118 13', vb: '0 0 120 16', sw: 2.4 },
  /** two relaxed strokes running together */
  double: { d: 'M2 5 C 32 2, 62 9, 118 4.5 M2 12 C 32 9, 62 16, 118 11.5', vb: '0 0 120 19', sw: 2.2 },
  /** three short strokes, like a struck-through margin note */
  dashes: {
    d: 'M2 6 C 10 4, 20 9, 28 6 M40 6 C 48 4, 58 9, 66 6 M78 6 C 86 4, 96 9, 104 6',
    vb: '0 0 106 12',
    sw: 2.2,
  },
  /** short version of the underline, for tight corners */
  tick: { d: 'M2 7 C 14 4, 30 10, 46 6', vb: '0 0 48 13', sw: 2.2 },
  /** long stroke that lifts at the tail */
  swoop: { d: 'M2 11 C 34 9, 70 8, 96 5 S 114 2, 118 2', vb: '0 0 120 14', sw: 2.4 },
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
  { shape: 'underline', className: 'absolute top-0 left-16 w-36 -rotate-2' },
  { shape: 'tick', className: 'absolute -top-1 left-1/3 w-16 rotate-3', color: DUSTY },
  { shape: 'drift', className: 'absolute top-0 left-1/2 w-36 rotate-1' },
  { shape: 'double', className: 'absolute -top-2 right-1/3 w-28 -rotate-2', color: FOREST },
  { shape: 'dip', className: 'absolute top-0 right-24 w-24 rotate-2' },
  { shape: 'swoop', className: 'absolute top-0 right-8 w-28 rotate-1', color: BRICK },

  // left edge
  { shape: 'tilt', className: 'absolute top-20 -left-6 w-28 rotate-90' },
  { shape: 'dashes', className: 'absolute top-1/3 -left-4 w-24 rotate-90', color: DUSTY },
  { shape: 'underline', className: 'absolute top-1/2 -left-8 w-36 rotate-90' },
  { shape: 'arc', className: 'absolute bottom-1/4 -left-5 w-28 rotate-90', color: BRICK },
  { shape: 'drift', className: 'absolute bottom-24 -left-8 w-36 rotate-90' },

  // right edge
  { shape: 'rise', className: 'absolute top-24 -right-5 w-28 rotate-90', color: FOREST },
  { shape: 'underline', className: 'absolute top-1/2 -right-8 w-36 rotate-90' },
  { shape: 'double', className: 'absolute bottom-1/3 -right-4 w-24 rotate-90', color: DUSTY },
  { shape: 'tick', className: 'absolute bottom-16 -right-3 w-16 rotate-90' },

  // bottom edge
  { shape: 'drift', className: 'absolute bottom-0 left-10 w-32 rotate-180', color: FOREST },
  { shape: 'swoop', className: 'absolute bottom-0 left-1/4 w-28 rotate-180' },
  { shape: 'dashes', className: 'absolute -bottom-1 left-1/2 w-24 -rotate-2', color: BRICK },
  { shape: 'arc', className: 'absolute bottom-0 right-1/3 w-28 rotate-180' },
  { shape: 'underline', className: 'absolute bottom-0 right-16 w-36 rotate-2' },
  { shape: 'tilt', className: 'absolute bottom-1 right-10 w-24 -rotate-3', color: DUSTY },
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
