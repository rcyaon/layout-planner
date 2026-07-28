import { Group, Rect, Line, Text } from 'react-konva';
import type { DieSettings, Unit } from '../types';
import { formatLength } from '../lib/units';

interface Props {
  die: DieSettings;
  /** Screen pixels per nm — chrome is divided by it to stay a constant size. */
  scale: number;
  unit: Unit;
  /** Something has drifted outside the die: warn instead of reassure. */
  overflowing: boolean;
}

const EDGE = '#8d7a55';
const EDGE_WARN = '#d99b3c';
const LABEL = '#b4a892';
const OUTSIDE = '#000000';

/** How far outside the die the dimming extends — well past any sane viewport. */
const APRON = 40;

/**
 * The die boundary drawn under a bounded layout: everything outside the die is
 * pushed back, and the two edges nearest the origin carry their dimension.
 *
 * The die's top-left corner sits on the origin, so in-bounds coordinates run
 * 0…width and 0…height and read the same way as a floorplan's.
 */
export default function DieFrame({ die, scale, unit, overflowing }: Props) {
  if (die.mode !== 'fixed') return null;

  const { width: w, height: h } = die;
  const stroke = overflowing ? EDGE_WARN : EDGE;
  const line = 1.5 / scale;
  const font = 12 / scale;
  const gap = 8 / scale;

  // Four bands rather than one punched rect: Konva has no even-odd fill, and
  // bands keep the die interior showing the canvas background untouched.
  const apronW = w * APRON;
  const apronH = h * APRON;
  const bands = [
    { x: -apronW, y: -apronH, width: apronW * 2 + w, height: apronH },
    { x: -apronW, y: h, width: apronW * 2 + w, height: apronH },
    { x: -apronW, y: 0, width: apronW, height: h },
    { x: w, y: 0, width: apronW, height: h },
  ];

  return (
    <Group listening={false}>
      {bands.map((b, i) => (
        <Rect key={i} {...b} fill={OUTSIDE} opacity={0.72} />
      ))}

      <Rect x={0} y={0} width={w} height={h} stroke={stroke} strokeWidth={line} />

      {/* Dimensions sit just inside the edges rather than outside them: a die
          framed in the viewport has no margin left over to print them in. */}
      <Text
        text={formatLength(w, unit)}
        x={0}
        y={gap}
        width={w}
        align="center"
        fontSize={font}
        fill={LABEL}
      />
      <Text
        text={formatLength(h, unit)}
        x={gap}
        y={h}
        width={h}
        align="center"
        rotation={-90}
        fontSize={font}
        fill={LABEL}
      />

      {/* corner ticks, so the boundary stays findable when zoomed in */}
      {[
        [0, 0, 1, 1],
        [w, 0, -1, 1],
        [0, h, 1, -1],
        [w, h, -1, -1],
      ].map(([cx, cy, sx, sy], i) => {
        const t = Math.min(w, h) * 0.04;
        return (
          <Line
            key={`c${i}`}
            points={[cx + sx * t, cy, cx, cy, cx, cy + sy * t]}
            stroke={stroke}
            strokeWidth={line * 2}
          />
        );
      })}
    </Group>
  );
}
