// ---------------------------------------------------------------------------
// Turns a parsed netlist into canvas elements.
//
// Devices are laid out cell by cell in a tidy grid — a starting point for a
// floorplan, not a placement algorithm. Sizes are symbolic: they read the
// relative W/L (or R/C value) of a device so bigger devices look bigger.
// ---------------------------------------------------------------------------

import type { DeviceElement, Element, LayerId, TextElement, NetlistInfo } from '../types';
import type { NetlistCell, NetlistDevice, ParsedNetlist } from './netlist';
import { formatValue, parseValue, toMicrons } from './netlist';
import { DEVICE_DEF_MAP } from './componentDefs';
import { uid } from './geometry';

export interface NetlistImportOptions {
  /** Cell names to generate (matches `NetlistCell.name`). */
  cells: string[];
  /** Scale devices by W/L and passive values instead of using default sizes. */
  scaleToSize: boolean;
  /** Put each cell's devices in their own group. */
  groupCells: boolean;
  /** Drop a text label above each cell. */
  labelCells: boolean;
  /** Devices per row; 0 = auto (roughly square). */
  columns: number;
  /** Gap between devices, in world units. */
  spacing: number;
}

export const DEFAULT_IMPORT_OPTIONS: Omit<NetlistImportOptions, 'cells'> = {
  scaleToSize: true,
  groupCells: true,
  labelCells: true,
  columns: 0,
  spacing: 40,
};

interface Ctx {
  originX: number;
  originY: number;
  gridSize: number;
  snap: boolean;
  /** Metal layer assigned to generated blocks, matching manual placement. */
  blockLayer?: { id: LayerId; color: string };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Reference geometry the scaling is relative to. */
const REF_W_UM = 1; // 1 µm channel width  → default device width
const REF_L_UM = 0.18; // 0.18 µm channel length → default device height
const REF_R = 1e3; // 1 kΩ  → default resistor height
const REF_C = 1e-12; // 1 pF  → default capacitor size

/** Snap a coordinate to the grid (may be negative). */
function snapPos(v: number, step: number, snap: boolean): number {
  const r = !snap || step <= 0 ? Math.round(v) : Math.round(v / step) * step;
  return r === 0 ? 0 : r; // avoid -0 leaking into the model
}

/** Snap a size to the grid, never smaller than one grid step. */
function snapSize(v: number, step: number, snap: boolean): number {
  if (!snap || step <= 0) return Math.max(1, Math.round(v));
  return Math.max(step, Math.round(v / step) * step);
}

function multiplicity(d: NetlistDevice): number {
  const m = parseValue(d.params.m ?? d.params.mult ?? d.params.mf);
  return m && m > 0 ? m : 1;
}

/**
 * Symbolic size for a device. Areas grow with the square root of the electrical
 * quantity so a 100× device is 10× wider, keeping large arrays on screen.
 */
function deviceSize(
  d: NetlistDevice,
  opts: NetlistImportOptions,
  ctx: Ctx,
  cellSizes: Map<string, number>,
): { width: number; height: number } {
  const def = DEVICE_DEF_MAP[d.kind];
  const base = { width: def.defaultWidth, height: def.defaultHeight };
  const fit = (w: number, h: number) => ({
    width: snapSize(w, ctx.gridSize, ctx.snap),
    height: snapSize(h, ctx.gridSize, ctx.snap),
  });

  if (!opts.scaleToSize) {
    // A sub-block still gets sized by how much it contains.
    if (d.kind === 'block' && d.subcktRef) {
      const n = cellSizes.get(d.subcktRef.toLowerCase()) ?? 0;
      if (n) return fit(def.defaultWidth * clamp(Math.sqrt(n / 4), 0.8, 3), def.defaultHeight * clamp(Math.sqrt(n / 4), 0.8, 3));
    }
    return fit(base.width, base.height);
  }

  if (d.kind === 'nmos' || d.kind === 'pmos') {
    const w = toMicrons(parseValue(d.params.w));
    const l = toMicrons(parseValue(d.params.l));
    const totalW = w != null ? w * multiplicity(d) : null;
    const wScale = totalW != null ? clamp(Math.sqrt(totalW / REF_W_UM), 0.6, 3.5) : 1;
    const hScale = l != null ? clamp(Math.sqrt(l / REF_L_UM), 0.7, 2) : 1;
    return fit(base.width * wScale, base.height * hScale);
  }

  if (d.kind === 'resistor') {
    const w = toMicrons(parseValue(d.params.w));
    const l = toMicrons(parseValue(d.params.l));
    if (w != null && l != null) {
      return fit(
        base.width * clamp(Math.sqrt(w / REF_W_UM), 0.6, 3),
        base.height * clamp(Math.sqrt(l / (REF_W_UM * 5)), 0.6, 3),
      );
    }
    const r = d.value;
    const s = r != null && r > 0 ? clamp(Math.sqrt(r / REF_R), 0.6, 3) : 1;
    return fit(base.width, base.height * s);
  }

  if (d.kind === 'capacitor') {
    const c = d.value;
    const s = c != null && c > 0 ? clamp(Math.sqrt(c / REF_C), 0.6, 3) : 1;
    return fit(base.width * s, base.height * s);
  }

  // block: size by the device count of the cell it instantiates
  const n = d.subcktRef ? cellSizes.get(d.subcktRef.toLowerCase()) ?? 0 : 0;
  const s = n ? clamp(Math.sqrt(n / 4), 0.8, 3) : 1;
  return fit(base.width * s, base.height * s);
}

/** Multi-line note text shown in the properties panel. */
function noteFor(d: NetlistDevice, cell: NetlistCell): string {
  const lines: string[] = [];
  lines.push(`${d.name}${d.model ? ` · ${d.model}` : ''} (${cell.name})`);
  if (d.nets.length) {
    lines.push(d.nets.map((n, i) => `${d.terminals[i] ?? `p${i + 1}`}=${n}`).join('  '));
  }
  const params = Object.entries(d.params);
  if (params.length) lines.push(params.map(([k, v]) => `${k}=${v}`).join('  '));
  if (d.value != null) {
    lines.push(`value=${formatValue(d.value, d.kind === 'resistor' ? 'Ω' : d.kind === 'capacitor' ? 'F' : '')}`);
  }
  return lines.join('\n');
}

function infoFor(d: NetlistDevice, cell: NetlistCell): NetlistInfo {
  return {
    instance: d.name,
    model: d.model,
    cell: cell.name,
    nets: d.nets.map((net, i) => ({ terminal: d.terminals[i] ?? `p${i + 1}`, net })),
    params: d.params,
  };
}

interface Placed {
  el: DeviceElement;
  width: number;
  height: number;
}

/**
 * Build canvas elements for the selected cells. Cells are stacked vertically,
 * devices within a cell fill a grid row by row in netlist order.
 */
export function buildNetlistElements(
  parsed: ParsedNetlist,
  opts: NetlistImportOptions,
  ctx: Ctx,
): Element[] {
  const wanted = new Set(opts.cells);
  const cells = parsed.cells.filter((c) => wanted.has(c.name));
  if (!cells.length) return [];

  // device count per cell name — used to size sub-block placeholders
  const cellSizes = new Map<string, number>();
  for (const c of parsed.cells) cellSizes.set(c.name.toLowerCase(), c.devices.length);

  const gap = Math.max(ctx.gridSize, opts.spacing);
  const out: Element[] = [];
  let cursorY = ctx.originY;

  for (const cell of cells) {
    const groupId = opts.groupCells ? uid() : null;

    if (opts.labelCells) {
      const label: TextElement = {
        id: uid(),
        type: 'text',
        x: ctx.originX,
        y: cursorY,
        rotation: 0,
        label: '',
        notes: '',
        locked: false,
        groupId,
        text: `${cell.name}  —  ${cell.devices.length} device${cell.devices.length === 1 ? '' : 's'}`,
        fontSize: 16,
        color: '#e7e7ee',
        width: 320,
        callout: false,
      };
      out.push(label);
      cursorY = snapPos(cursorY + 34, ctx.gridSize, ctx.snap);
    }

    const placed: Placed[] = cell.devices.map((d) => {
      const def = DEVICE_DEF_MAP[d.kind];
      const { width, height } = deviceSize(d, opts, ctx, cellSizes);
      const isBlock = d.kind === 'block';
      const el: DeviceElement = {
        id: uid(),
        type: 'device',
        kind: d.kind,
        x: 0,
        y: 0,
        rotation: 0,
        label: d.name,
        notes: noteFor(d, cell),
        locked: false,
        groupId,
        width,
        height,
        color: isBlock ? ctx.blockLayer?.color ?? def.color : def.color,
        layer: isBlock ? ctx.blockLayer?.id ?? null : null,
        netlist: infoFor(d, cell),
      };
      return { el, width, height };
    });

    const cols = opts.columns > 0 ? opts.columns : clamp(Math.ceil(Math.sqrt(placed.length)), 1, 8);
    const colWidth: number[] = [];
    for (let i = 0; i < placed.length; i++) {
      const c = i % cols;
      colWidth[c] = Math.max(colWidth[c] ?? 0, placed[i].width);
    }
    const colX: number[] = [];
    let x = ctx.originX;
    for (let c = 0; c < colWidth.length; c++) {
      colX[c] = x;
      x += colWidth[c] + gap;
    }

    let rowY = cursorY;
    for (let r = 0; r * cols < placed.length; r++) {
      const row = placed.slice(r * cols, r * cols + cols);
      const rowHeight = Math.max(...row.map((p) => p.height));
      row.forEach((p, c) => {
        // centre each device inside its grid slot so mixed sizes stay tidy
        p.el.x = snapPos(colX[c] + (colWidth[c] - p.width) / 2, ctx.gridSize, ctx.snap);
        p.el.y = snapPos(rowY + (rowHeight - p.height) / 2, ctx.gridSize, ctx.snap);
        out.push(p.el);
      });
      rowY = snapPos(rowY + rowHeight + gap, ctx.gridSize, ctx.snap);
    }

    cursorY = snapPos(rowY + gap * 1.5, ctx.gridSize, ctx.snap);
  }

  return out;
}
