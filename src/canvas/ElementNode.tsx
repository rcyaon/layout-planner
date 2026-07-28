import { Group, Rect, Circle, Ellipse, Line, Text, Arrow } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Element, Layer } from '../types';
import DeviceSymbol from './DeviceSymbol';

interface Props {
  el: Element;
  selected: boolean;
  layers: Layer[];
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
  draggable,
  interactive,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  registerNode,
}: Props) {
  const layerColor = (id: string | null) => layers.find((l) => l.id === id)?.color ?? '#9aa';

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
        <DeviceSymbol el={el} layerColor={el.kind === 'block' && el.layer ? layerColor(el.layer) : undefined} />
        {el.label && (
          <Text text={el.label} x={0} y={-16} width={w} align="center" fontSize={12} fill="#d9cfbe" />
        )}
        {selected && (
          <Rect x={-3} y={-3} width={w + 6} height={h + 6} stroke={ACCENT} strokeWidth={1} dash={[4, 3]} listening={false} />
        )}
      </Group>
    );
  }

  if (el.type === 'text') {
    const h = el.fontSize * 1.6;
    return (
      <Group {...common} x={el.x} y={el.y} rotation={el.rotation} opacity={el.locked ? 0.6 : 1}>
        {el.callout && (
          <Rect x={-6} y={-4} width={el.width + 12} height={h + 8} cornerRadius={6} fill="#00000088" stroke={el.color} strokeWidth={1} />
        )}
        <Text text={el.text || ' '} width={el.width} fontSize={el.fontSize} fill={el.color} />
        {selected && (
          <Rect x={-8} y={-6} width={el.width + 16} height={h + 12} stroke={ACCENT} strokeWidth={1} dash={[4, 3]} listening={false} />
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
        {el.label && <Text text={el.label} x={0} y={-16} width={w} align="center" fontSize={12} fill="#d9cfbe" />}
        {selected && (
          <Rect x={-3} y={-3} width={w + 6} height={h + 6} stroke={ACCENT} strokeWidth={1} dash={[4, 3]} listening={false} />
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
            pointerLength={10}
            pointerWidth={10}
            hitStrokeWidth={14}
          />
        ) : (
          <Line
            points={el.points}
            stroke={stroke}
            strokeWidth={strokeWidth}
            lineCap="round"
            lineJoin="round"
            hitStrokeWidth={14}
            shadowColor={selected ? ACCENT : undefined}
            shadowBlur={selected ? 8 : 0}
            shadowOpacity={selected ? 1 : 0}
          />
        )}
        {selected && isArrow && (
          <Line points={el.points} stroke={ACCENT} strokeWidth={1} dash={[3, 3]} listening={false} />
        )}
        {el.label && el.points.length >= 2 && (
          <Text text={el.label} x={el.points[0] + 4} y={el.points[1] - 16} fontSize={11} fill={stroke} />
        )}
      </Group>
    );
  }

  if (el.type === 'measure') {
    const [x1, y1, x2, y2] = el.points;
    const d = Math.hypot(x2 - x1, y2 - y1).toFixed(1);
    return (
      <Group {...common} x={el.x} y={el.y} opacity={el.locked ? 0.6 : 1}>
        <Line points={el.points} stroke="#fbbf24" strokeWidth={1} hitStrokeWidth={14} />
        <Circle x={x1} y={y1} radius={3} fill="#fbbf24" />
        <Circle x={x2} y={y2} radius={3} fill="#fbbf24" />
        <Text text={`${d}`} x={(x1 + x2) / 2 - 20} y={(y1 + y2) / 2 - 18} width={40} align="center" fontSize={12} fill="#fbbf24" />
        {selected && <Line points={el.points} stroke={ACCENT} strokeWidth={1} dash={[3, 3]} listening={false} />}
      </Group>
    );
  }

  return null;
}
