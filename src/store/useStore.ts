import { create } from 'zustand';
import type {
  Element,
  DeviceElement,
  TextElement,
  Layer,
  GridSettings,
  ViewState,
  Tool,
  LayerId,
  DeviceKind,
  ProjectFile,
} from '../types';
import { DEVICE_DEF_MAP } from '../lib/componentDefs';
import { getBounds, uid, type Bounds } from '../lib/geometry';

export const DEFAULT_LAYERS: Layer[] = [
  { id: 'M1', name: 'Metal 1', color: '#5570c4', visible: true, locked: false },
  { id: 'M2', name: 'Metal 2', color: '#4a8f66', visible: true, locked: false },
  { id: 'M3', name: 'Metal 3', color: '#c15749', visible: true, locked: false },
];

export const DEFAULT_GRID: GridSettings = {
  size: 20,
  snap: true,
  visible: true,
  showRulers: true,
};

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
  setLayer: (id: LayerId, patch: Partial<Layer>) => void;
  setProjectName: (name: string) => void;
  setDialog: (d: DialogId) => void;

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
  loadProject: (file: ProjectFile) => void;
  toProjectFile: () => ProjectFile;
}

function pushSnap(s: AppState) {
  return {
    past: [...s.past, { elements: s.elements, layers: s.layers }].slice(-120),
    future: [] as Snapshot[],
  };
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

  tool: 'select',
  activeLayer: 'M1',
  selectedIds: [],
  view: { x: 0, y: 0, scale: 1 },
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
  setLayer: (id, patch) =>
    set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
  setProjectName: (name) => set({ projectName: name }),
  setDialog: (d) => set({ dialog: d }),

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
        fontSize: 16,
        color: '#e7e7ee',
        width: 160,
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
        return { ...e, id: uid(), x: e.x + 20, y: e.y + 20, groupId: gid } as Element;
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
        return { ...structuredClone(e), id: uid(), x: e.x + 24, y: e.y + 24, groupId: gid } as Element;
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

  newProject: () =>
    set({
      projectName: 'untitled',
      elements: [],
      layers: structuredClone(DEFAULT_LAYERS),
      grid: { ...DEFAULT_GRID },
      selectedIds: [],
      past: [],
      future: [],
      labelCounters: {},
    }),

  loadProject: (file) =>
    set({
      projectName: file.name || 'untitled',
      elements: Array.isArray(file.elements) ? file.elements : [],
      layers: file.layers?.length ? file.layers : structuredClone(DEFAULT_LAYERS),
      grid: { ...DEFAULT_GRID, ...(file.grid || {}) },
      selectedIds: [],
      past: [],
      future: [],
      labelCounters: recomputeCounters(file.elements || []),
    }),

  toProjectFile: () => {
    const s = get();
    return {
      version: 1,
      name: s.projectName,
      elements: s.elements,
      layers: s.layers,
      grid: s.grid,
      savedAt: new Date().toISOString(),
    };
  },
}));
