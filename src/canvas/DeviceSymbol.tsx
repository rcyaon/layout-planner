import { Group, Rect, Line, Text } from 'react-konva';
import type { DeviceElement, DeviceKind } from '../types';
import { PLAYER, pattern, type PatternKind } from '../lib/processLayers';

// --- reusable layout primitives --------------------------------------------

function LR({
  x,
  y,
  w,
  h,
  color,
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
  kind?: PatternKind;
  dash?: number[];
  radius?: number;
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
      stroke={color}
      strokeWidth={strokeW}
      dash={dash}
    />
  );
}

function Cut({ x, y, size = 5, cross = false }: { x: number; y: number; size?: number; cross?: boolean }) {
  return (
    <Group>
      <Rect
        x={x - size / 2}
        y={y - size / 2}
        width={size}
        height={size}
        fill={PLAYER.contact}
        stroke="#5b5f70"
        strokeWidth={0.7}
        cornerRadius={1}
      />
      {cross && (
        <>
          <Line points={[x - size / 2, y - size / 2, x + size / 2, y + size / 2]} stroke="#5b5f70" strokeWidth={0.7} />
          <Line points={[x + size / 2, y - size / 2, x - size / 2, y + size / 2]} stroke="#5b5f70" strokeWidth={0.7} />
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

// ---------------------------------------------------------------------------

export default function DeviceSymbol({ el, layerColor }: { el: DeviceElement; layerColor?: string }) {
  const { width: w, height: h, kind } = el;
  const tag = (
    <Text text={SHORT[kind]} x={2} y={h - 12} fontSize={9} fill="#b4a892" listening={false} />
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
          {kind === 'pmos' && <LR x={0} y={0} w={w} h={h} color={PLAYER.nwell} kind="dot" dash={[5, 3]} radius={4} />}
          {/* diffusion / active */}
          <LR x={w * inset} y={h * inset} w={w * (1 - 2 * inset)} h={h * (1 - 2 * inset)} color={diff} kind="diagUp" radius={2} />
          {/* metal1 over source / drain */}
          <LR x={w * (inset + 0.02)} y={h * 0.3} w={w * 0.16} h={h * 0.4} color={PLAYER.met1} kind="wash" radius={1.5} strokeW={0.8} />
          <LR x={w * (0.82 - inset)} y={h * 0.3} w={w * 0.16} h={h * 0.4} color={PLAYER.met1} kind="wash" radius={1.5} strokeW={0.8} />
          {/* poly gate with overhang */}
          <LR x={w * 0.44} y={-h * 0.05} w={w * 0.12} h={h * 1.1} color={PLAYER.poly} kind="diagDown" radius={1.5} />
          {/* contacts */}
          <Cut x={lx} y={cutY1} />
          <Cut x={lx} y={cutY2} />
          <Cut x={rx} y={cutY1} />
          <Cut x={rx} y={cutY2} />
          {tag}
        </Group>
      );
    }

    case 'resistor': {
      return (
        <Group>
          <LR x={w * 0.28} y={h * 0.1} w={w * 0.44} h={h * 0.8} color={PLAYER.res} kind="diagDown" radius={3} />
          <LR x={w * 0.16} y={h * 0.03} w={w * 0.68} h={h * 0.1} color={PLAYER.met1} kind="wash" radius={2} strokeW={0.8} />
          <LR x={w * 0.16} y={h * 0.87} w={w * 0.68} h={h * 0.1} color={PLAYER.met1} kind="wash" radius={2} strokeW={0.8} />
          <Cut x={w * 0.5} y={h * 0.08} />
          <Cut x={w * 0.5} y={h * 0.92} />
          {tag}
        </Group>
      );
    }

    case 'capacitor': {
      return (
        <Group>
          <LR x={w * 0.12} y={h * 0.3} w={w * 0.76} h={h * 0.58} color={PLAYER.met1} kind="diagUp" radius={3} />
          <LR x={w * 0.26} y={h * 0.13} w={w * 0.54} h={h * 0.5} color={PLAYER.met2} kind="diagDown" radius={3} />
          <Cut x={w * 0.5} y={h * 0.42} size={6} cross />
          {tag}
        </Group>
      );
    }

    case 'well': {
      return (
        <Group>
          <LR x={0} y={0} w={w} h={h} color={PLAYER.nwell} kind="dot" dash={[6, 4]} radius={6} strokeW={1.4} />
          {tag}
        </Group>
      );
    }

    case 'guardring': {
      const t = Math.min(w, h) * 0.14;
      const cuts = [];
      const n = Math.max(2, Math.floor(w / 34));
      for (let i = 0; i < n; i++) {
        const cx = t + ((w - 2 * t) * (i + 0.5)) / n;
        cuts.push(<Cut key={`t${i}`} x={cx} y={t / 2} size={Math.min(t * 0.6, 5)} />);
        cuts.push(<Cut key={`b${i}`} x={cx} y={h - t / 2} size={Math.min(t * 0.6, 5)} />);
      }
      const m = Math.max(1, Math.floor(h / 40));
      for (let i = 0; i < m; i++) {
        const cy = t + ((h - 2 * t) * (i + 0.5)) / m;
        cuts.push(<Cut key={`l${i}`} x={t / 2} y={cy} size={Math.min(t * 0.6, 5)} />);
        cuts.push(<Cut key={`r${i}`} x={w - t / 2} y={cy} size={Math.min(t * 0.6, 5)} />);
      }
      return (
        <Group>
          <LR x={0} y={0} w={w} h={t} color={PLAYER.nactive} kind="diagUp" />
          <LR x={0} y={h - t} w={w} h={t} color={PLAYER.nactive} kind="diagUp" />
          <LR x={0} y={0} w={t} h={h} color={PLAYER.nactive} kind="diagUp" />
          <LR x={w - t} y={0} w={t} h={h} color={PLAYER.nactive} kind="diagUp" />
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
          <LR x={0} y={0} w={w} h={h} color={bc} kind="cross" radius={4} strokeW={1.4} />
          <Text text={SHORT[kind]} x={2} y={h - 12} fontSize={9} fill={bc} listening={false} />
        </Group>
      );
    }
  }
}
