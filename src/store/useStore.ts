import { create } from 'zustand';
import type {
  Element,
  DeviceElement,
  TextElement,
  Layer,
  GridSettings,
  DieSettings,
  ViewState,
  Tool,
  LayerId,
  DeviceKind,
  ProjectFile,
} from '../types';
import { DEVICE_DEF_MAP } from '../lib/componentDefs';
import { getBounds, uid, type Bounds } from '../lib/geometry';
import { DEFAULT_SCALE, clampScale, px, type Unit } from '../lib/units';
import {
  DEFAULT_DIE,
  DEFAULT_GRID,
  DEFAULT_UNIT,
  migrateProject,
} from '../lib/projectFile';

export { DEFAULT_DIE, DEFAULT_GRID } from '../lib/projectFile';

export const DEFAULT_LAYERS: Layer[] = [
  { id: 'M1', name: 'Metal 1', color: '#5570c4', visible: true, locked: false },
  { id: 'M2', name: 'Metal 2', color: '#4a8f66', visible: true, locked: false },
  { id: 'M3', name: 'Metal 3', color: '#c15749', visible: true, locked: false },
];

/** Where a fresh project starts: the origin a little in from the top-left. */
export const DEFAULT_VIEW: ViewState = { x: 80, y: 80, scale: DEFAULT_SCALE };

/** Offset applied to duplicated / pasted elements, in nm. */
const DUPLICATE_OFFSET = px(20);
const PASTE_OFFSET = px(24);

/** Default type size for a new text element, in nm. */
const TEXT_FONT_SIZE = px(16);

export type DialogId = 'netlist' | null;

type OrderAction = 'front' | 'back' | 'forward' | 'backward';
type AlignType = 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY';
type DistributeAxis = 'h' | 'v';

interface Snapshot {
  elements: Element[];
  layers: Layer[];
}

interface AppState {
  projectName: string;
  elements: Element[];
  layers: Layer[];
  grid: GridSettings;
  die: DieSettings;
  /** Unit every length is shown and entered in. Storage is always nm. */
  unit: Unit;

  tool: Tool;
  activeLayer: LayerId;
  selectedIds: string[];
  view: ViewState;
  cursor: { x: number; y: number };
  stageSize: { width: number; height: number };
  /** Which modal dialog is open (`null` = none). */
  dialog: DialogId;

  past: Snapshot[];
  future: Snapshot[];
  clipboard: Element[];
  labelCounters: Record<string, number>;

  // ui setters -------------------------------------------------------------
  setTool: (t: Tool) => void;
  setActiveLayer: (id: LayerId) => void;
  setView: (patch: Partial<ViewState>) => void;
  setCursor: (x: number, y: number) => void;
  setGrid: (patch: Partial<GridSettings>) => void;
  setDie: (patch: Partial<DieSettings>) => void;
  setUnit: (u: Unit) => void;
  setLayer: (id: LayerId, patch: Partial<Layer>) => void;
  setProjectName: (name: string) => void;
  setDialog: (d: DialogId) => void;

  // viewport ---------------------------------------------------------------
  /** Frame `rect` (nm) in the viewport, or the whole design when omitted. */
  fitTo: (rect?: Bounds) => void;
  resetView: () => void;

  // history ----------------------------------------------------------------
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // selection --------------------------------------------------------------
  select: (ids: string[], additive?: boolean) => void;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // element mutation -------------------------------------------------------
  setStageSize: (width: number, height: number) => void;
  addElement: (el: Element, selectIt?: boolean) => void;
  addElements: (els: Element[]) => void;
  addDevice: (kind: DeviceKind, x: number, y: number) => void;
  addDeviceCenter: (kind: DeviceKind) => void;
  addText: (x: number, y: number, callout?: boolean) => void;
  updateElement: (id: string, patch: Record<string, unknown>) => void;
  updateElements: (ids: string[], patch: Record<string, unknown>) => void;
  moveSelectedBy: (dx: number, dy: number) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  copy: () => void;
  paste: () => void;
  group: () => void;
  ungroup: () => void;
  align: (type: AlignType) => void;
  distribute: (axis: DistributeAxis) => void;
  order: (action: OrderAction) => void;
  toggleLockSelected: () => void;

  // project ----------------------------------------------------------------
  newProject: () => void;
  /** Takes raw parsed JSON — older file versions are migrated on the way in. */
  loadProject: (raw: unknown) => void;
  toProjectFile: () => ProjectFile;
}

function pushSnap(s: AppState) {
  return {
    past: [...s.past, { elements: s.elements, layers: s.layers }].slice(-120),
    future: [] as Snapshot[],
  };
}

/**
 * Everything worth framing: the die (when there is one) plus every element, so
 * "zoom to fit" never hides work that has drifted outside the die.
 */
export function contentBounds(elements: Element[], die: DieSettings): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (b: Bounds) => {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  };
  if (die.mode === 'fixed') add({ x: 0, y: 0, width: die.width, height: die.height });
  for (const el of elements) add(getBounds(el));
  if (minX === Infinity) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Ids of elements not fully inside a fixed die. Empty on an infinite canvas. */
export function outsideDie(elements: Element[], die: DieSettings): string[] {
  if (die.mode !== 'fixed') return [];
  return elements
    .filter((el) => {
      const b = getBounds(el);
      return b.x < 0 || b.y < 0 || b.x + b.width > die.width || b.y + b.height > die.height;
    })
    .map((el) => el.id);
}

function recomputeCounters(elements: Element[]): Record<string, number> {
  const counters: Record<string, number> = {};
  for (const el of elements) {
    const m = /^([A-Za-z]+)(\d+)$/.exec(el.label);
    if (m) {
      const [, prefix, num] = m;
      counters[prefix] = Math.max(counters[prefix] ?? 0, Number(num));
    }
  }
  return counters;
}

export const useStore = create<AppState>((set, get) => ({
  projectName: 'untitled',
  elements: [],
  layers: structuredClone(DEFAULT_LAYERS),
  grid: { ...DEFAULT_GRID },
  die: { ...DEFAULT_DIE },
  unit: DEFAULT_UNIT,

  tool: 'select',
  activeLayer: 'M1',
  selectedIds: [],
  view: { ...DEFAULT_VIEW },
  cursor: { x: 0, y: 0 },
  stageSize: { width: 800, height: 600 },
  dialog: null,

  past: [],
  future: [],
  clipboard: [],
  labelCounters: {},

  setTool: (t) => set({ tool: t }),
  setActiveLayer: (id) => set({ activeLayer: id }),
  setView: (patch) => set((s) => ({ view: { ...s.view, ...patch } })),
  setCursor: (x, y) => set({ cursor: { x, y } }),
  setGrid: (patch) => set((s) => ({ grid: { ...s.grid, ...patch } })),
  setDie: (patch) => set((s) => ({ die: { ...s.die, ...patch } })),
  setUnit: (u) => set({ unit: u }),
  setLayer: (id, patch) =>
    set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
  setProjectName: (name) => set({ projectName: name }),
  setDialog: (d) => set({ dialog: d }),

  fitTo: (rect) => {
    const s = get();
    const target = rect ?? contentBounds(s.elements, s.die);
    if (!target) return get().resetView();
    const { width, height } = s.stageSize;
    // Leave a tenth of the viewport as breathing room on every side.
    const scale = clampScale(
      Math.min((width * 0.9) / (target.width || 1), (height * 0.9) / (target.height || 1)),
    );
    set({
      view: {
        scale,
        x: width / 2 - (target.x + target.width / 2) * scale,
        y: height / 2 - (target.y + target.height / 2) * scale,
      },
    });
  },

  resetView: () => {
    const s = get();
    // A bounded die has an obvious "home"; an infinite canvas only has the origin.
    if (s.die.mode === 'fixed') {
      get().fitTo({ x: 0, y: 0, width: s.die.width, height: s.die.height });
      return;
    }
    set({ view: { ...DEFAULT_VIEW } });
  },

  pushHistory: () => set((s) => pushSnap(s)),

  undo: () =>
    set((s) => {
      if (!s.past.length) return {};
      const prev = s.past[s.past.length - 1];
      const liveIds = new Set(prev.elements.map((e) => e.id));
      return {
        past: s.past.slice(0, -1),
        future: [...s.future, { elements: s.elements, layers: s.layers }],
        elements: prev.elements,
        layers: prev.layers,
        selectedIds: s.selectedIds.filter((id) => liveIds.has(id)),
      };
    }),

  redo: () =>
    set((s) => {
      if (!s.future.length) return {};
      const next = s.future[s.future.length - 1];
      const liveIds = new Set(next.elements.map((e) => e.id));
      return {
        future: s.future.slice(0, -1),
        past: [...s.past, { elements: s.elements, layers: s.layers }],
        elements: next.elements,
        layers: next.layers,
        selectedIds: s.selectedIds.filter((id) => liveIds.has(id)),
      };
    }),

  select: (ids, additive = false) =>
    set((s) => ({
      selectedIds: additive ? Array.from(new Set([...s.selectedIds, ...ids])) : ids,
    })),
  toggleSelect: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id],
    })),
  selectAll: () =>
    set((s) => ({ selectedIds: s.elements.filter((e) => !e.locked).map((e) => e.id) })),
  clearSelection: () => set({ selectedIds: [] }),

  setStageSize: (width, height) => set({ stageSize: { width, height } }),

  addElement: (el, selectIt = true) =>
    set((s) => ({
      ...pushSnap(s),
      elements: [...s.elements, el],
      selectedIds: selectIt ? [el.id] : s.selectedIds,
    })),

  /** Bulk insert (netlist import): one history entry, all new items selected. */
  addElements: (els) =>
    set((s) => {
      if (!els.length) return {};
      const added = recomputeCounters(els);
      const labelCounters = { ...s.labelCounters };
      for (const [prefix, n] of Object.entries(added)) {
        labelCounters[prefix] = Math.max(labelCounters[prefix] ?? 0, n);
      }
      return {
        ...pushSnap(s),
        elements: [...s.elements, ...els],
        selectedIds: els.map((e) => e.id),
        labelCounters,
      };
    }),

  addDevice: (kind, x, y) =>
    set((s) => {
      const def = DEVICE_DEF_MAP[kind];
      const n = (s.labelCounters[def.labelPrefix] ?? 0) + 1;
      const isBlock = kind === 'block';
      const layer = isBlock ? s.activeLayer : null;
      const color = isBlock
        ? s.layers.find((l) => l.id === s.activeLayer)?.color ?? def.color
        : def.color;
      const el: DeviceElement = {
        id: uid(),
        type: 'device',
        kind,
        x,
        y,
        rotation: 0,
        label: `${def.labelPrefix}${n}`,
        notes: '',
        locked: false,
        groupId: null,
        width: def.defaultWidth,
        height: def.defaultHeight,
        color,
        layer,
      };
      return {
        ...pushSnap(s),
        elements: [...s.elements, el],
        selectedIds: [el.id],
        labelCounters: { ...s.labelCounters, [def.labelPrefix]: n },
      };
    }),

  addDeviceCenter: (kind) => {
    const s = get();
    const def = DEVICE_DEF_MAP[kind];
    // small cascade so repeated center-drops don't stack perfectly
    const cascade = (s.elements.length % 8) * s.grid.size;
    const cx = (s.stageSize.width / 2 - s.view.x) / s.view.scale + cascade;
    const cy = (s.stageSize.height / 2 - s.view.y) / s.view.scale + cascade;
    const gx = s.grid.snap ? Math.round((cx - def.defaultWidth / 2) / s.grid.size) * s.grid.size : cx - def.defaultWidth / 2;
    const gy = s.grid.snap ? Math.round((cy - def.defaultHeight / 2) / s.grid.size) * s.grid.size : cy - def.defaultHeight / 2;
    get().addDevice(kind, gx, gy);
  },

  addText: (x, y, callout = false) =>
    set((s) => {
      const el: TextElement = {
        id: uid(),
        type: 'text',
        x,
        y,
        rotation: 0,
        label: '',
        notes: '',
        locked: false,
        groupId: null,
        text: callout ? 'Callout' : 'Label',
        fontSize: TEXT_FONT_SIZE,
        color: '#e7e7ee',
        width: TEXT_FONT_SIZE * 10,
        callout,
      };
      return { ...pushSnap(s), elements: [...s.elements, el], selectedIds: [el.id] };
    }),

  updateElement: (id, patch) =>
    set((s) => ({
      elements: s.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as Element) : e)),
    })),

  updateElements: (ids, patch) =>
    set((s) => {
      const idset = new Set(ids);
      return {
        elements: s.elements.map((e) =>
          idset.has(e.id) ? ({ ...e, ...patch } as Element) : e,
        ),
      };
    }),

  moveSelectedBy: (dx, dy) =>
    set((s) => {
      const sel = new Set(s.selectedIds);
      if (!sel.size) return {};
      return {
        ...pushSnap(s),
        elements: s.elements.map((e) =>
          sel.has(e.id) && !e.locked ? { ...e, x: e.x + dx, y: e.y + dy } : e,
        ),
      };
    }),

  removeSelected: () =>
    set((s) => {
      const sel = new Set(s.selectedIds);
      if (!sel.size) return {};
      return {
        ...pushSnap(s),
        elements: s.elements.filter((e) => !(sel.has(e.id) && !e.locked)),
        selectedIds: [],
      };
    }),

  duplicateSelected: () =>
    set((s) => {
      const sel = s.elements.filter((e) => s.selectedIds.includes(e.id));
      if (!sel.length) return {};
      const groupRemap: Record<string, string> = {};
      const copies = sel.map((e) => {
        const gid = e.groupId ? (groupRemap[e.groupId] ??= uid()) : null;
        return {
          ...e,
          id: uid(),
          x: e.x + DUPLICATE_OFFSET,
          y: e.y + DUPLICATE_OFFSET,
          groupId: gid,
        } as Element;
      });
      return {
        ...pushSnap(s),
        elements: [...s.elements, ...copies],
        selectedIds: copies.map((c) => c.id),
      };
    }),

  copy: () =>
    set((s) => ({
      clipboard: s.elements
        .filter((e) => s.selectedIds.includes(e.id))
        .map((e) => structuredClone(e)),
    })),

  paste: () =>
    set((s) => {
      if (!s.clipboard.length) return {};
      const groupRemap: Record<string, string> = {};
      const copies = s.clipboard.map((e) => {
        const gid = e.groupId ? (groupRemap[e.groupId] ??= uid()) : null;
        return {
          ...structuredClone(e),
          id: uid(),
          x: e.x + PASTE_OFFSET,
          y: e.y + PASTE_OFFSET,
          groupId: gid,
        } as Element;
      });
      return {
        ...pushSnap(s),
        elements: [...s.elements, ...copies],
        selectedIds: copies.map((c) => c.id),
      };
    }),

  group: () =>
    set((s) => {
      if (s.selectedIds.length < 2) return {};
      const gid = uid();
      const sel = new Set(s.selectedIds);
      return {
        ...pushSnap(s),
        elements: s.elements.map((e) => (sel.has(e.id) ? { ...e, groupId: gid } : e)),
      };
    }),

  ungroup: () =>
    set((s) => {
      const sel = new Set(s.selectedIds);
      if (!sel.size) return {};
      return {
        ...pushSnap(s),
        elements: s.elements.map((e) => (sel.has(e.id) ? { ...e, groupId: null } : e)),
      };
    }),

  align: (type) =>
    set((s) => {
      const sel = s.elements.filter((e) => s.selectedIds.includes(e.id) && !e.locked);
      if (sel.length < 2) return {};
      const bs = sel.map((e) => ({ e, b: getBounds(e) }));
      const minX = Math.min(...bs.map((x) => x.b.x));
      const maxX = Math.max(...bs.map((x) => x.b.x + x.b.width));
      const minY = Math.min(...bs.map((x) => x.b.y));
      const maxY = Math.max(...bs.map((x) => x.b.y + x.b.height));
      const cX = (minX + maxX) / 2;
      const cY = (minY + maxY) / 2;
      const deltas = new Map<string, { dx: number; dy: number }>();
      for (const { e, b } of bs) {
        let dx = 0;
        let dy = 0;
        if (type === 'left') dx = minX - b.x;
        else if (type === 'right') dx = maxX - (b.x + b.width);
        else if (type === 'centerX') dx = cX - (b.x + b.width / 2);
        else if (type === 'top') dy = minY - b.y;
        else if (type === 'bottom') dy = maxY - (b.y + b.height);
        else if (type === 'centerY') dy = cY - (b.y + b.height / 2);
        deltas.set(e.id, { dx, dy });
      }
      return {
        ...pushSnap(s),
        elements: s.elements.map((e) => {
          const d = deltas.get(e.id);
          return d ? { ...e, x: e.x + d.dx, y: e.y + d.dy } : e;
        }),
      };
    }),

  distribute: (axis) =>
    set((s) => {
      const sel = s.elements.filter((e) => s.selectedIds.includes(e.id) && !e.locked);
      if (sel.length < 3) return {};
      const items = sel.map((e) => ({ e, b: getBounds(e) }));
      const center = (b: Bounds) => (axis === 'h' ? b.x + b.width / 2 : b.y + b.height / 2);
      items.sort((a, b) => center(a.b) - center(b.b));
      const first = center(items[0].b);
      const last = center(items[items.length - 1].b);
      const step = (last - first) / (items.length - 1);
      const deltas = new Map<string, { dx: number; dy: number }>();
      items.forEach((it, i) => {
        const target = first + step * i;
        const cur = center(it.b);
        deltas.set(it.e.id, axis === 'h' ? { dx: target - cur, dy: 0 } : { dx: 0, dy: target - cur });
      });
      return {
        ...pushSnap(s),
        elements: s.elements.map((e) => {
          const d = deltas.get(e.id);
          return d ? { ...e, x: e.x + d.dx, y: e.y + d.dy } : e;
        }),
      };
    }),

  order: (action) =>
    set((s) => {
      const sel = new Set(s.selectedIds);
      if (!sel.size) return {};
      const arr = [...s.elements];
      let next: Element[];
      if (action === 'front') {
        next = [...arr.filter((e) => !sel.has(e.id)), ...arr.filter((e) => sel.has(e.id))];
      } else if (action === 'back') {
        next = [...arr.filter((e) => sel.has(e.id)), ...arr.filter((e) => !sel.has(e.id))];
      } else {
        next = arr;
        if (action === 'forward') {
          for (let i = next.length - 2; i >= 0; i--) {
            if (sel.has(next[i].id) && !sel.has(next[i + 1].id)) {
              [next[i], next[i + 1]] = [next[i + 1], next[i]];
            }
          }
        } else {
          for (let i = 1; i < next.length; i++) {
            if (sel.has(next[i].id) && !sel.has(next[i - 1].id)) {
              [next[i], next[i - 1]] = [next[i - 1], next[i]];
            }
          }
        }
      }
      return { ...pushSnap(s), elements: next };
    }),

  toggleLockSelected: () =>
    set((s) => {
      const sel = new Set(s.selectedIds);
      if (!sel.size) return {};
      const anyUnlocked = s.elements.some((e) => sel.has(e.id) && !e.locked);
      return {
        ...pushSnap(s),
        elements: s.elements.map((e) => (sel.has(e.id) ? { ...e, locked: anyUnlocked } : e)),
      };
    }),

  newProject: () => {
    set({
      projectName: 'untitled',
      elements: [],
      layers: structuredClone(DEFAULT_LAYERS),
      grid: { ...DEFAULT_GRID },
      die: { ...DEFAULT_DIE },
      unit: DEFAULT_UNIT,
      selectedIds: [],
      past: [],
      future: [],
      labelCounters: {},
    });
    get().resetView();
  },

  /** Accepts files from any version — `migrateProject` normalizes them. */
  loadProject: (raw) => {
    const file = migrateProject(raw);
    if (!file) return;
    set({
      projectName: file.name,
      elements: file.elements,
      layers: file.layers.length ? file.layers : structuredClone(DEFAULT_LAYERS),
      grid: file.grid,
      die: file.die,
      unit: file.unit,
      selectedIds: [],
      past: [],
      future: [],
      labelCounters: recomputeCounters(file.elements),
    });
    get().fitTo();
  },

  toProjectFile: () => {
    const s = get();
    return {
      version: 2,
      name: s.projectName,
      elements: s.elements,
      layers: s.layers,
      grid: s.grid,
      die: s.die,
      unit: s.unit,
      savedAt: new Date().toISOString(),
    };
  },
}));
