import { Group, Rect, Line, Text } from 'react-konva';
import type { DeviceElement, DeviceKind } from '../types';
import { PLAYER, pattern, type PatternKind } from '../lib/processLayers';

// A device is a real size in nanometres, so everything inside its symbol is
// expressed as a fraction of that size — except the outlines and the type,
// which are ink: those take `scale` (screen px per nm) and divide by it so they
// stay hairline-thin whether you are looking at 2 µm or 2 mm of layout.

// --- reusable layout primitives --------------------------------------------

function LR({
  x,
  y,
  w,
  h,
  color,
  scale,
  kind = 'wash',
  dash,
  radius = 0,
  strokeW = 1.2,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  /** Screen pixels per nm. */
  scale: number;
  kind?: PatternKind;
  /** Dash pattern in screen pixels. */
  dash?: number[];
  /** Corner radius in nm. */
  radius?: number;
  /** Outline weight in screen pixels. */
  strokeW?: number;
}) {
  return (
    <Rect
      x={x}
      y={y}
      width={Math.max(0, w)}
      height={Math.max(0, h)}
      cornerRadius={radius}
      fillPatternImage={pattern(color, kind) as unknown as HTMLImageElement | undefined}
      fillPatternRepeat="repeat"
      // The stipple tile is 8 px of screen, as in a real layout viewer — undo
      // the stage zoom so the hatch does not stretch with the geometry.
      fillPatternScaleX={1 / scale}
      fillPatternScaleY={1 / scale}
      stroke={color}
      strokeWidth={strokeW / scale}
      dash={dash?.map((d) => d / scale)}
    />
  );
}

function Cut({
  x,
  y,
  size,
  scale,
  cross = false,
}: {
  x: number;
  y: number;
  /** Contact size in nm. */
  size: number;
  scale: number;
  cross?: boolean;
}) {
  const hair = 0.7 / scale;
  return (
    <Group>
      <Rect
        x={x - size / 2}
        y={y - size / 2}
        width={size}
        height={size}
        fill={PLAYER.contact}
        stroke="#5b5f70"
        strokeWidth={hair}
        cornerRadius={size / 5}
      />
      {cross && (
        <>
          <Line points={[x - size / 2, y - size / 2, x + size / 2, y + size / 2]} stroke="#5b5f70" strokeWidth={hair} />
          <Line points={[x + size / 2, y - size / 2, x - size / 2, y + size / 2]} stroke="#5b5f70" strokeWidth={hair} />
        </>
      )}
    </Group>
  );
}

const SHORT: Record<DeviceKind, string> = {
  nmos: 'nmos',
  pmos: 'pmos',
  resistor: 'res',
  capacitor: 'cap',
  well: 'nwell',
  guardring: 'gring',
  block: 'blk',
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------------------

export default function DeviceSymbol({
  el,
  scale,
  layerColor,
}: {
  el: DeviceElement;
  scale: number;
  layerColor?: string;
}) {
  const { width: w, height: h, kind } = el;
  const min = Math.min(w, h);
  /** Contact size — a fraction of the device so arrays stay in proportion. */
  const cut = min * 0.085;
  /** Corner rounding, scaled off the device rather than fixed in pixels. */
  const r = min * 0.03;
  const font = 9 / scale;
  const tag = (
    <Text text={SHORT[kind]} x={r} y={h - font * 1.4} fontSize={font} fill="#b4a892" listening={false} />
  );

  switch (kind) {
    case 'nmos':
    case 'pmos': {
      const diff = kind === 'nmos' ? PLAYER.nactive : PLAYER.pactive;
      const inset = kind === 'pmos' ? 0.16 : 0.12;
      const cutY1 = h * 0.36;
      const cutY2 = h * 0.64;
      const lx = w * (kind === 'pmos' ? 0.29 : 0.27);
      const rx = w * (kind === 'pmos' ? 0.71 : 0.73);
      return (
        <Group>
          {kind === 'pmos' && (
            <LR x={0} y={0} w={w} h={h} color={PLAYER.nwell} scale={scale} kind="dot" dash={[5, 3]} radius={r * 1.4} />
          )}
          {/* diffusion / active */}
          <LR x={w * inset} y={h * inset} w={w * (1 - 2 * inset)} h={h * (1 - 2 * inset)} color={diff} scale={scale} kind="diagUp" radius={r * 0.7} />
          {/* metal1 over source / drain */}
          <LR x={w * (inset + 0.02)} y={h * 0.3} w={w * 0.16} h={h * 0.4} color={PLAYER.met1} scale={scale} kind="wash" radius={r * 0.5} strokeW={0.8} />
          <LR x={w * (0.82 - inset)} y={h * 0.3} w={w * 0.16} h={h * 0.4} color={PLAYER.met1} scale={scale} kind="wash" radius={r * 0.5} strokeW={0.8} />
          {/* poly gate with overhang */}
          <LR x={w * 0.44} y={-h * 0.05} w={w * 0.12} h={h * 1.1} color={PLAYER.poly} scale={scale} kind="diagDown" radius={r * 0.5} />
          {/* contacts */}
          <Cut x={lx} y={cutY1} size={cut} scale={scale} />
          <Cut x={lx} y={cutY2} size={cut} scale={scale} />
          <Cut x={rx} y={cutY1} size={cut} scale={scale} />
          <Cut x={rx} y={cutY2} size={cut} scale={scale} />
          {tag}
        </Group>
      );
    }

    case 'resistor': {
      return (
        <Group>
          <LR x={w * 0.28} y={h * 0.1} w={w * 0.44} h={h * 0.8} color={PLAYER.res} scale={scale} kind="diagDown" radius={r} />
          <LR x={w * 0.16} y={h * 0.03} w={w * 0.68} h={h * 0.1} color={PLAYER.met1} scale={scale} kind="wash" radius={r * 0.7} strokeW={0.8} />
          <LR x={w * 0.16} y={h * 0.87} w={w * 0.68} h={h * 0.1} color={PLAYER.met1} scale={scale} kind="wash" radius={r * 0.7} strokeW={0.8} />
          <Cut x={w * 0.5} y={h * 0.08} size={cut} scale={scale} />
          <Cut x={w * 0.5} y={h * 0.92} size={cut} scale={scale} />
          {tag}
        </Group>
      );
    }

    case 'capacitor': {
      return (
        <Group>
          <LR x={w * 0.12} y={h * 0.3} w={w * 0.76} h={h * 0.58} color={PLAYER.met1} scale={scale} kind="diagUp" radius={r} />
          <LR x={w * 0.26} y={h * 0.13} w={w * 0.54} h={h * 0.5} color={PLAYER.met2} scale={scale} kind="diagDown" radius={r} />
          <Cut x={w * 0.5} y={h * 0.42} size={cut * 1.2} scale={scale} cross />
          {tag}
        </Group>
      );
    }

    case 'well': {
      return (
        <Group>
          <LR x={0} y={0} w={w} h={h} color={PLAYER.nwell} scale={scale} kind="dot" dash={[6, 4]} radius={r * 2} strokeW={1.4} />
          {tag}
        </Group>
      );
    }

    case 'guardring': {
      const t = min * 0.14;
      const cutSize = t * 0.5;
      const cuts = [];
      // Space the contacts about 1.6 ring-widths apart, the way the pixel-era
      // symbol read, so the ring keeps its dotted look at any device size.
      const n = clamp(Math.round(w / (t * 1.6)), 2, 40);
      for (let i = 0; i < n; i++) {
        const cx = t + ((w - 2 * t) * (i + 0.5)) / n;
        cuts.push(<Cut key={`t${i}`} x={cx} y={t / 2} size={cutSize} scale={scale} />);
        cuts.push(<Cut key={`b${i}`} x={cx} y={h - t / 2} size={cutSize} scale={scale} />);
      }
      const m = clamp(Math.round(h / (t * 1.8)), 1, 40);
      for (let i = 0; i < m; i++) {
        const cy = t + ((h - 2 * t) * (i + 0.5)) / m;
        cuts.push(<Cut key={`l${i}`} x={t / 2} y={cy} size={cutSize} scale={scale} />);
        cuts.push(<Cut key={`r${i}`} x={w - t / 2} y={cy} size={cutSize} scale={scale} />);
      }
      return (
        <Group>
          <LR x={0} y={0} w={w} h={t} color={PLAYER.nactive} scale={scale} kind="diagUp" />
          <LR x={0} y={h - t} w={w} h={t} color={PLAYER.nactive} scale={scale} kind="diagUp" />
          <LR x={0} y={0} w={t} h={h} color={PLAYER.nactive} scale={scale} kind="diagUp" />
          <LR x={w - t} y={0} w={t} h={h} color={PLAYER.nactive} scale={scale} kind="diagUp" />
          {cuts}
          {tag}
        </Group>
      );
    }

    case 'block':
    default: {
      const bc = layerColor ?? PLAYER.block;
      return (
        <Group>
          <LR x={0} y={0} w={w} h={h} color={bc} scale={scale} kind="cross" radius={r * 1.4} strokeW={1.4} />
          <Text text={SHORT[kind]} x={r} y={h - font * 1.4} fontSize={font} fill={bc} listening={false} />
        </Group>
      );
    }
  }
}
