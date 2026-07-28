import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { DragEvent as RDragEvent, ReactNode } from 'react';
import { Stage, Layer, Line, Rect, Transformer } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useStore } from '../store/useStore';
import type { Element, LayerId, DeviceKind, ShapeElement, WireElement, MeasureElement } from '../types';
import { snap, getBounds, rectsIntersect, uid } from '../lib/geometry';
import ElementNode from './ElementNode';
import Rulers from './Rulers';
import { stageHolder } from './stageHolder';

const MINOR = '#231e16';
const MAJOR = '#2e2820';
const AXIS = '#463d2f';
const RULER = 22;
const SELECT = '#8aa0e0';
const DEFAULT_STROKE = '#e2e8f0';

interface Draft {
  tool: string;
  sx: number;
  sy: number;
  cx: number;
  cy: number;
}
interface Poly {
  tool: 'polyline' | 'wire';
  points: number[];
  cx: number;
  cy: number;
}
interface Box {
  sx: number;
  sy: number;
  cx: number;
  cy: number;
  additive: boolean;
}

const transformable = (el: Element) =>
  el.type === 'device' ||
  el.type === 'text' ||
  (el.type === 'shape' && (el.shape === 'rect' || el.shape === 'circle'));

export default function CanvasStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const nodeMap = useRef<Map<string, Konva.Node>>(new Map());
  const dragOrigin = useRef<{ anchor: string; sel: string[]; last: { x: number; y: number } | null } | null>(null);

  const [size, setSize] = useState({ width: 800, height: 600 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [poly, setPoly] = useState<Poly | null>(null);
  const [box, setBox] = useState<Box | null>(null);

  const elements = useStore((s) => s.elements);
  const layers = useStore((s) => s.layers);
  const grid = useStore((s) => s.grid);
  const tool = useStore((s) => s.tool);
  const activeLayer = useStore((s) => s.activeLayer);
  const selectedIds = useStore((s) => s.selectedIds);
  const view = useStore((s) => s.view);

  const hiddenLayers = new Set(layers.filter((l) => !l.visible).map((l) => l.id));
  const lockedLayers = new Set(layers.filter((l) => l.locked).map((l) => l.id));

  const layerOf = (el: Element): LayerId | null =>
    el.type === 'wire'
      ? el.layer
      : el.type === 'shape'
        ? el.layer
        : el.type === 'device'
          ? el.layer ?? null
          : null;

  // --- resize observer ------------------------------------------------------
  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const apply = () => {
      setSize({ width: node.clientWidth, height: node.clientHeight });
      useStore.getState().setStageSize(node.clientWidth, node.clientHeight);
    };
    const ro = new ResizeObserver(apply);
    ro.observe(node);
    apply();
    return () => ro.disconnect();
  }, []);

  // --- expose stage to export tools ----------------------------------------
  useEffect(() => {
    stageHolder.stage = stageRef.current;
    return () => {
      stageHolder.stage = null;
    };
  }, []);

  // --- space-to-pan ---------------------------------------------------------
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTypingTarget(e.target)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
      if (e.code === 'Escape') {
        setDraft(null);
        setPoly(null);
        setBox(null);
      }
      if (e.code === 'Enter' && poly && poly.points.length >= 4) {
        finalizePoly();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poly]);

  // --- transformer follows selection ---------------------------------------
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const nodes = selectedIds
      .map((id) => elements.find((e) => e.id === id))
      .filter((el): el is Element => !!el && transformable(el) && !el.locked)
      .map((el) => nodeMap.current.get(el.id))
      .filter((n): n is Konva.Node => !!n);
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, elements]);

  // --- coordinate helpers ---------------------------------------------------
  const pointerWorld = () => {
    const stage = stageRef.current!;
    const p = stage.getPointerPosition();
    if (!p) return { x: 0, y: 0 };
    const t = stage.getAbsoluteTransform().copy();
    t.invert();
    return t.point(p);
  };
  const snapPt = (p: { x: number; y: number }) => ({
    x: snap(p.x, grid.size, grid.snap),
    y: snap(p.y, grid.size, grid.snap),
  });

  // --- wheel zoom -----------------------------------------------------------
  const onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current!;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const oldScale = view.scale;
    const mousePointTo = {
      x: (pointer.x - view.x) / oldScale,
      y: (pointer.y - view.y) / oldScale,
    };
    const factor = 1.08;
    let newScale = e.evt.deltaY > 0 ? oldScale / factor : oldScale * factor;
    newScale = Math.max(0.05, Math.min(20, newScale));
    useStore.getState().setView({
      scale: newScale,
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  // --- pointer interactions -------------------------------------------------
  const onStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (spaceHeld) return; // panning handled by draggable stage
    const st = useStore.getState();
    const isEmpty = e.target === e.target.getStage();
    const raw = pointerWorld();
    const p = snapPt(raw);

    if (tool === 'select') {
      if (isEmpty) {
        if (!e.evt.shiftKey) st.clearSelection();
        setBox({ sx: raw.x, sy: raw.y, cx: raw.x, cy: raw.y, additive: e.evt.shiftKey });
      }
      return;
    }
    if (tool === 'text') {
      st.addText(p.x, p.y);
      st.setTool('select');
      return;
    }
    if (tool === 'polyline' || tool === 'wire') {
      setPoly((prev) => {
        const pts = prev ? [...prev.points] : [];
        pts.push(p.x, p.y);
        return { tool, points: pts, cx: p.x, cy: p.y };
      });
      return;
    }
    setDraft({ tool, sx: p.x, sy: p.y, cx: p.x, cy: p.y });
  };

  const onStageMouseMove = () => {
    const raw = pointerWorld();
    useStore.getState().setCursor(Math.round(raw.x), Math.round(raw.y));
    const p = snapPt(raw);
    if (box) setBox({ ...box, cx: raw.x, cy: raw.y });
    if (draft) setDraft({ ...draft, cx: p.x, cy: p.y });
    if (poly) setPoly({ ...poly, cx: p.x, cy: p.y });
  };

  const onStageMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    const st = useStore.getState();
    if (box) {
      const bx = Math.min(box.sx, box.cx);
      const by = Math.min(box.sy, box.cy);
      const bw = Math.abs(box.cx - box.sx);
      const bh = Math.abs(box.cy - box.sy);
      if (bw > 3 || bh > 3) {
        const rect = { x: bx, y: by, width: bw, height: bh };
        const hits = elements
          .filter((el) => {
            const lid = layerOf(el);
            if (lid && (hiddenLayers.has(lid) || lockedLayers.has(lid))) return false;
            return rectsIntersect(getBounds(el), rect);
          })
          .map((el) => el.id);
        st.select(hits, box.additive || e.evt.shiftKey);
      }
      setBox(null);
    }
    if (draft) {
      const el = makeDraftElement(draft, activeLayer);
      if (el) st.addElement(el);
      setDraft(null);
    }
  };

  const finalizePoly = () => {
    const cur = poly;
    setPoly(null);
    if (!cur || cur.points.length < 4) return;
    const st = useStore.getState();
    const ox = cur.points[0];
    const oy = cur.points[1];
    const rel = cur.points.map((v, i) => (i % 2 === 0 ? v - ox : v - oy));
    if (cur.tool === 'wire') {
      const w: WireElement = {
        id: uid(), type: 'wire', x: ox, y: oy, rotation: 0,
        label: '', notes: '', locked: false, groupId: null,
        points: rel, strokeWidth: 3, layer: activeLayer,
      };
      st.addElement(w);
    } else {
      const shape: ShapeElement = {
        id: uid(), type: 'shape', shape: 'polyline', x: ox, y: oy, rotation: 0,
        label: '', notes: '', locked: false, groupId: null,
        width: 0, height: 0, points: rel, stroke: DEFAULT_STROKE, fill: 'transparent',
        strokeWidth: 2, layer: null,
      };
      st.addElement(shape);
    }
  };

  const onStageDblClick = () => {
    if (poly) finalizePoly();
  };

  // --- element drag (single + group) ---------------------------------------
  const toTopLeft = (el: Element, nx: number, ny: number) => {
    if (el.type === 'device' || (el.type === 'shape' && (el.shape === 'rect' || el.shape === 'circle'))) {
      const w = 'width' in el ? el.width : 0;
      const h = 'height' in el ? el.height : 0;
      return { x: nx - w / 2, y: ny - h / 2 };
    }
    return { x: nx, y: ny };
  };

  const handleDragStart = (id: string) => {
    const st = useStore.getState();
    st.pushHistory();
    let sel = st.selectedIds;
    if (!sel.includes(id)) {
      st.select([id]);
      sel = [id];
    }
    dragOrigin.current = { anchor: id, sel, last: null };
  };

  const handleDragMove = (id: string, nx: number, ny: number) => {
    const o = dragOrigin.current;
    if (!o) return;
    const st = useStore.getState();
    const anchor = st.elements.find((e) => e.id === id);
    if (!anchor) return;
    const tl = toTopLeft(anchor, nx, ny);
    if (o.last === null) {
      o.last = tl;
      st.updateElement(id, tl);
      return;
    }
    const dx = tl.x - o.last.x;
    const dy = tl.y - o.last.y;
    o.last = tl;
    for (const sid of o.sel) {
      const el = useStore.getState().elements.find((e) => e.id === sid);
      if (el && !el.locked) st.updateElement(sid, { x: el.x + dx, y: el.y + dy });
    }
  };

  const handleDragEnd = () => {
    const o = dragOrigin.current;
    dragOrigin.current = null;
    if (!o) return;
    const st = useStore.getState();
    for (const sid of o.sel) {
      const el = st.elements.find((e) => e.id === sid);
      if (el && !el.locked) {
        st.updateElement(sid, { x: snap(el.x, grid.size, grid.snap), y: snap(el.y, grid.size, grid.snap) });
      }
    }
  };

  // --- transformer resize/rotate -------------------------------------------
  const handleTransformEnd = () => {
    const tr = trRef.current;
    if (!tr) return;
    const st = useStore.getState();
    st.pushHistory();
    for (const node of tr.nodes()) {
      const id = node.id();
      const el = st.elements.find((e) => e.id === id);
      if (!el) continue;
      const sx = node.scaleX();
      const sy = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      if (el.type === 'text') {
        const width = Math.max(20, el.width * sx);
        const fontSize = Math.max(6, el.fontSize * sy);
        st.updateElement(id, { x: node.x(), y: node.y(), width, fontSize, rotation: node.rotation() });
      } else if ('width' in el && 'height' in el) {
        const width = Math.max(6, Math.round(el.width * sx));
        const height = Math.max(6, Math.round(el.height * sy));
        st.updateElement(id, {
          x: node.x() - width / 2,
          y: node.y() - height / 2,
          width,
          height,
          rotation: node.rotation(),
        });
      }
    }
  };

  const onSelectNode = (id: string, additive: boolean) => {
    const st = useStore.getState();
    if (additive) st.toggleSelect(id);
    else st.select([id]);
  };

  const registerNode = (id: string, node: Konva.Node | null) => {
    if (node) nodeMap.current.set(id, node);
    else nodeMap.current.delete(id);
  };

  // --- grid lines -----------------------------------------------------------
  const gridLines: ReactNode[] = [];
  if (grid.visible) {
    let step = grid.size;
    while (step * view.scale < 6) step *= 5;
    const x0 = -view.x / view.scale;
    const y0 = -view.y / view.scale;
    const x1 = x0 + size.width / view.scale;
    const y1 = y0 + size.height / view.scale;
    const major = step * 5;
    const startX = Math.floor(x0 / step) * step;
    const startY = Math.floor(y0 / step) * step;
    let count = 0;
    for (let x = startX; x <= x1 && count < 4000; x += step, count++) {
      const isAxis = Math.abs(x) < 1e-6;
      const isMajor = Math.abs(x % major) < 1e-6;
      gridLines.push(
        <Line key={`v${x}`} points={[x, y0, x, y1]} stroke={isAxis ? AXIS : isMajor ? MAJOR : MINOR} strokeWidth={1 / view.scale} />,
      );
    }
    for (let y = startY; y <= y1 && count < 8000; y += step, count++) {
      const isAxis = Math.abs(y) < 1e-6;
      const isMajor = Math.abs(y % major) < 1e-6;
      gridLines.push(
        <Line key={`h${y}`} points={[x0, y, x1, y]} stroke={isAxis ? AXIS : isMajor ? MAJOR : MINOR} strokeWidth={1 / view.scale} />,
      );
    }
  }

  const cursorStyle = spaceHeld ? 'grab' : tool === 'select' ? 'default' : 'crosshair';

  const onDrop = (e: RDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData('application/x-iclp-device') as DeviceKind;
    if (!kind) return;
    const stage = stageRef.current;
    if (!stage) return;
    stage.setPointersPositions(e as unknown as DragEvent);
    const raw = pointerWorld();
    useStore
      .getState()
      .addDevice(kind, snap(raw.x, grid.size, grid.snap), snap(raw.y, grid.size, grid.snap));
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-xl2 border border-edge bg-canvas shadow-soft"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={view.x}
        y={view.y}
        scaleX={view.scale}
        scaleY={view.scale}
        draggable={spaceHeld}
        onWheel={onWheel}
        onMouseDown={onStageMouseDown}
        onMouseMove={onStageMouseMove}
        onMouseUp={onStageMouseUp}
        onDblClick={onStageDblClick}
        onDragMove={(e) => {
          if (e.target === stageRef.current) {
            useStore.getState().setView({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            useStore.getState().setView({ x: e.target.x(), y: e.target.y() });
          }
        }}
        style={{ cursor: cursorStyle }}
      >
        <Layer listening={false}>{gridLines}</Layer>

        <Layer>
          {elements.map((el) => {
            const lid = layerOf(el);
            if (lid && hiddenLayers.has(lid)) return null;
            const layerLocked = !!lid && lockedLayers.has(lid);
            const draggable = tool === 'select' && !spaceHeld && !el.locked && !layerLocked;
            return (
              <ElementNode
                key={el.id}
                el={el}
                selected={selectedIds.includes(el.id)}
                layers={layers}
                draggable={draggable}
                interactive={!layerLocked}
                onSelect={onSelectNode}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                registerNode={registerNode}
              />
            );
          })}
        </Layer>

        <Layer>
          {/* draft preview */}
          {draft && <DraftPreview draft={draft} layerColor={layers.find((l) => l.id === activeLayer)?.color ?? DEFAULT_STROKE} />}
          {/* polyline / wire preview */}
          {poly && (
            <Line
              points={[...poly.points, poly.cx, poly.cy]}
              stroke={poly.tool === 'wire' ? layers.find((l) => l.id === activeLayer)?.color : DEFAULT_STROKE}
              strokeWidth={2 / view.scale}
              dash={[6 / view.scale, 4 / view.scale]}
            />
          )}
          {/* box select */}
          {box && (
            <Rect
              x={Math.min(box.sx, box.cx)}
              y={Math.min(box.sy, box.cy)}
              width={Math.abs(box.cx - box.sx)}
              height={Math.abs(box.cy - box.sy)}
              fill="#8aa0e022"
              stroke={SELECT}
              strokeWidth={1 / view.scale}
            />
          )}
          <Transformer
            ref={trRef}
            rotationSnaps={[0, 90, 180, 270]}
            rotateAnchorOffset={24}
            flipEnabled={false}
            ignoreStroke
            onTransformEnd={handleTransformEnd}
            boundBoxFunc={(oldBox, newBox) => (newBox.width < 6 || newBox.height < 6 ? oldBox : newBox)}
          />
        </Layer>
      </Stage>

      {grid.showRulers && <Rulers width={size.width - RULER} height={size.height - RULER} view={view} step={grid.size} />}
    </div>
  );
}

// --- helpers ---------------------------------------------------------------

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

function makeDraftElement(d: Draft, activeLayer: LayerId): Element | null {
  const x = Math.min(d.sx, d.cx);
  const y = Math.min(d.sy, d.cy);
  const w = Math.abs(d.cx - d.sx);
  const h = Math.abs(d.cy - d.sy);
  const base = { id: uid(), rotation: 0, label: '', notes: '', locked: false, groupId: null as string | null };

  if (d.tool === 'rect' || d.tool === 'circle') {
    if (w < 3 || h < 3) return null;
    return {
      ...base, type: 'shape', shape: d.tool, x, y, width: w, height: h,
      points: [], stroke: DEFAULT_STROKE, fill: 'transparent', strokeWidth: 2, layer: null,
    } as ShapeElement;
  }
  if (d.tool === 'line' || d.tool === 'arrow') {
    if (Math.hypot(d.cx - d.sx, d.cy - d.sy) < 3) return null;
    return {
      ...base, type: 'shape', shape: d.tool, x: d.sx, y: d.sy, width: 0, height: 0,
      points: [0, 0, d.cx - d.sx, d.cy - d.sy], stroke: DEFAULT_STROKE, fill: 'transparent',
      strokeWidth: 2, layer: null,
    } as ShapeElement;
  }
  if (d.tool === 'measure') {
    if (Math.hypot(d.cx - d.sx, d.cy - d.sy) < 3) return null;
    return {
      ...base, type: 'measure', x: d.sx, y: d.sy, points: [0, 0, d.cx - d.sx, d.cy - d.sy],
    } as MeasureElement;
  }
  // wire single-segment via drag fallback (not used; wire uses poly)
  void activeLayer;
  return null;
}

function DraftPreview({ draft, layerColor }: { draft: Draft; layerColor: string }) {
  const x = Math.min(draft.sx, draft.cx);
  const y = Math.min(draft.sy, draft.cy);
  const w = Math.abs(draft.cx - draft.sx);
  const h = Math.abs(draft.cy - draft.sy);
  if (draft.tool === 'rect') {
    return <Rect x={x} y={y} width={w} height={h} stroke={DEFAULT_STROKE} strokeWidth={1} dash={[4, 3]} />;
  }
  if (draft.tool === 'circle') {
    return <Rect x={x} y={y} width={w} height={h} stroke={DEFAULT_STROKE} strokeWidth={1} dash={[4, 3]} cornerRadius={Math.min(w, h) / 2} />;
  }
  const color = draft.tool === 'measure' ? '#fbbf24' : layerColor;
  return <Line points={[draft.sx, draft.sy, draft.cx, draft.cy]} stroke={color} strokeWidth={1} dash={[4, 3]} />;
}
