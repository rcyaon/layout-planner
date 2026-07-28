import { Group, Rect, Circle, Ellipse, Line, Text, Arrow } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Element, Layer, Unit } from '../types';
import { formatLength } from '../lib/units';
import DeviceSymbol from './DeviceSymbol';

interface Props {
  el: Element;
  selected: boolean;
  layers: Layer[];
  unit: Unit;
  /** Screen pixels per nm. Annotation is divided by it to stay legible. */
  scale: number;
  draggable: boolean;
  interactive: boolean;
  onSelect: (id: string, additive: boolean) => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: () => void;
  registerNode: (id: string, node: Konva.Node | null) => void;
}

const ACCENT = '#8aa0e0';

export default function ElementNode({
  el,
  selected,
  layers,
  unit,
  scale,
  draggable,
  interactive,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  registerNode,
}: Props) {
  const layerColor = (id: string | null) => layers.find((l) => l.id === id)?.color ?? '#9aa';

  // Screen-space sizes for everything that annotates the layout rather than
  // being part of it: labels, selection outlines, hit padding. A layout spans
  // hundreds of micrometres, so a fixed nm size would be unreadable at one zoom
  // level and overwhelming at the next.
  const labelFont = 12 / scale;
  const outline = 1 / scale;
  const dash = [4 / scale, 3 / scale];
  const inset = 3 / scale;
  const hit = 14 / scale;

  const common = {
    id: el.id,
    name: el.type,
    listening: interactive,
    draggable,
    onClick: (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      onSelect(el.id, e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey);
    },
    onTap: (e: KonvaEventObject<Event>) => {
      e.cancelBubble = true;
      onSelect(el.id, false);
    },
    onDragStart: (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      onDragStart(el.id);
    },
    onDragMove: (e: KonvaEventObject<DragEvent>) => {
      onDragMove(el.id, e.target.x(), e.target.y());
    },
    onDragEnd: (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      onDragEnd();
    },
    ref: (node: Konva.Node | null) => registerNode(el.id, node),
  };

  // --- rotatable, box-shaped elements (center origin) -----------------------
  if (el.type === 'device') {
    const w = el.width;
    const h = el.height;
    return (
      <Group
        {...common}
        x={el.x + w / 2}
        y={el.y + h / 2}
        offsetX={w / 2}
        offsetY={h / 2}
        rotation={el.rotation}
        opacity={el.locked ? 0.6 : 1}
      >
        <DeviceSymbol
          el={el}
          scale={scale}
          layerColor={el.kind === 'block' && el.layer ? layerColor(el.layer) : undefined}
        />
        {el.label && (
          <Text
            text={el.label}
            x={0}
            y={-labelFont * 1.35}
            width={w}
            align="center"
            fontSize={labelFont}
            fill="#d9cfbe"
          />
        )}
        {selected && (
          <Rect
            x={-inset}
            y={-inset}
            width={w + inset * 2}
            height={h + inset * 2}
            stroke={ACCENT}
            strokeWidth={outline}
            dash={dash}
            listening={false}
          />
        )}
      </Group>
    );
  }

  if (el.type === 'text') {
    const h = el.fontSize * 1.6;
    return (
      <Group {...common} x={el.x} y={el.y} rotation={el.rotation} opacity={el.locked ? 0.6 : 1}>
        {el.callout && (
          <Rect
            x={-el.fontSize * 0.4}
            y={-el.fontSize * 0.25}
            width={el.width + el.fontSize * 0.8}
            height={h + el.fontSize * 0.5}
            cornerRadius={el.fontSize * 0.4}
            fill="#00000088"
            stroke={el.color}
            strokeWidth={outline}
          />
        )}
        <Text text={el.text || ' '} width={el.width} fontSize={el.fontSize} fill={el.color} />
        {selected && (
          <Rect
            x={-inset * 2}
            y={-inset * 2}
            width={el.width + inset * 4}
            height={h + inset * 4}
            stroke={ACCENT}
            strokeWidth={outline}
            dash={dash}
            listening={false}
          />
        )}
      </Group>
    );
  }

  if (el.type === 'shape' && (el.shape === 'rect' || el.shape === 'circle')) {
    const w = el.width;
    const h = el.height;
    const stroke = el.layer ? layerColor(el.layer) : el.stroke;
    return (
      <Group
        {...common}
        x={el.x + w / 2}
        y={el.y + h / 2}
        offsetX={w / 2}
        offsetY={h / 2}
        rotation={el.rotation}
        opacity={el.locked ? 0.6 : 1}
      >
        {el.shape === 'rect' ? (
          <Rect width={w} height={h} fill={el.fill} stroke={stroke} strokeWidth={el.strokeWidth} />
        ) : (
          <Ellipse x={w / 2} y={h / 2} radiusX={w / 2} radiusY={h / 2} fill={el.fill} stroke={stroke} strokeWidth={el.strokeWidth} />
        )}
        {el.label && (
          <Text text={el.label} x={0} y={-labelFont * 1.35} width={w} align="center" fontSize={labelFont} fill="#d9cfbe" />
        )}
        {selected && (
          <Rect
            x={-inset}
            y={-inset}
            width={w + inset * 2}
            height={h + inset * 2}
            stroke={ACCENT}
            strokeWidth={outline}
            dash={dash}
            listening={false}
          />
        )}
      </Group>
    );
  }

  // --- point-based elements (top-left origin, no transformer) ---------------
  if (el.type === 'wire' || (el.type === 'shape' && el.shape !== 'rect' && el.shape !== 'circle')) {
    const stroke =
      el.type === 'wire' ? layerColor(el.layer) : el.layer ? layerColor(el.layer) : (el as Extract<Element, { type: 'shape' }>).stroke;
    const strokeWidth = el.type === 'wire' ? el.strokeWidth : (el as Extract<Element, { type: 'shape' }>).strokeWidth;
    const isArrow = el.type === 'shape' && el.shape === 'arrow';
    return (
      <Group {...common} x={el.x} y={el.y} opacity={el.locked ? 0.6 : 1}>
        {isArrow ? (
          <Arrow
            points={el.points}
            stroke={stroke}
            fill={stroke}
            strokeWidth={strokeWidth}
            pointerLength={strokeWidth * 5}
            pointerWidth={strokeWidth * 5}
            hitStrokeWidth={hit}
          />
        ) : (
          <Line
            points={el.points}
            stroke={stroke}
            strokeWidth={strokeWidth}
            lineCap="round"
            lineJoin="round"
            hitStrokeWidth={hit}
            shadowColor={selected ? ACCENT : undefined}
            shadowBlur={selected ? 8 / scale : 0}
            shadowOpacity={selected ? 1 : 0}
          />
        )}
        {selected && isArrow && (
          <Line points={el.points} stroke={ACCENT} strokeWidth={outline} dash={dash} listening={false} />
        )}
        {el.label && el.points.length >= 2 && (
          <Text
            text={el.label}
            x={el.points[0] + labelFont * 0.35}
            y={el.points[1] - labelFont * 1.35}
            fontSize={labelFont}
            fill={stroke}
          />
        )}
      </Group>
    );
  }

  if (el.type === 'measure') {
    const [x1, y1, x2, y2] = el.points;
    // A measurement is the one label that has to speak in the project's unit.
    const d = formatLength(Math.hypot(x2 - x1, y2 - y1), unit);
    const box = labelFont * 6;
    return (
      <Group {...common} x={el.x} y={el.y} opacity={el.locked ? 0.6 : 1}>
        <Line points={el.points} stroke="#fbbf24" strokeWidth={outline} hitStrokeWidth={hit} />
        <Circle x={x1} y={y1} radius={outline * 3} fill="#fbbf24" />
        <Circle x={x2} y={y2} radius={outline * 3} fill="#fbbf24" />
        <Text
          text={d}
          x={(x1 + x2) / 2 - box / 2}
          y={(y1 + y2) / 2 - labelFont * 1.5}
          width={box}
          align="center"
          fontSize={labelFont}
          fill="#fbbf24"
        />
        {selected && <Line points={el.points} stroke={ACCENT} strokeWidth={outline} dash={dash} listening={false} />}
      </Group>
    );
  }

  return null;
}
