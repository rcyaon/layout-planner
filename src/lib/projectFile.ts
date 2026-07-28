// ---------------------------------------------------------------------------
// Reading project files written by older versions of the app.
//
// v1 stored geometry in screen pixels at 100 % zoom. v2 stores nanometres, so a
// v1 file is upgraded by scaling every length by NM_PER_PX — which keeps an old
// layout looking exactly the same, just now with real dimensions attached.
// ---------------------------------------------------------------------------

import type { Element, ProjectFile, DieSettings, GridSettings } from '../types';
import { NM_PER_PX, UNITS, type Unit } from './units';

export const DEFAULT_DIE: DieSettings = {
  mode: 'infinite',
  width: 100_000, // 100 µm
  height: 100_000,
};

export const DEFAULT_GRID: GridSettings = {
  size: 100, // nm
  snap: true,
  visible: true,
  showRulers: true,
};

export const DEFAULT_UNIT: Unit = 'um';

function scalePoints(points: unknown, k: number): number[] {
  return Array.isArray(points) ? points.map((v) => (typeof v === 'number' ? v * k : 0)) : [];
}

/** Scale one element's lengths from pixels to nanometres. */
function scaleElement(el: Element, k: number): Element {
  const base = { ...el, x: el.x * k, y: el.y * k };
  switch (base.type) {
    case 'device':
      return { ...base, width: base.width * k, height: base.height * k };
    case 'shape':
      return {
        ...base,
        width: base.width * k,
        height: base.height * k,
        points: scalePoints(base.points, k),
        strokeWidth: base.strokeWidth * k,
      };
    case 'wire':
      return { ...base, points: scalePoints(base.points, k), strokeWidth: base.strokeWidth * k };
    case 'text':
      return { ...base, width: base.width * k, fontSize: base.fontSize * k };
    case 'measure':
      return { ...base, points: scalePoints(base.points, k) };
  }
}

const isUnit = (u: unknown): u is Unit => UNITS.includes(u as Unit);

/**
 * Normalize anything claiming to be a project file into the current shape.
 * Unknown or missing fields fall back to defaults rather than throwing — a
 * half-readable file is more useful than a hard failure on load.
 */
export function migrateProject(raw: unknown): ProjectFile | null {
  if (!raw || typeof raw !== 'object') return null;
  const file = raw as Partial<ProjectFile> & { version?: number };
  const version = Number(file.version) || 1;

  let elements = Array.isArray(file.elements) ? file.elements : [];
  let grid: GridSettings = { ...DEFAULT_GRID, ...(file.grid ?? {}) };
  let die: DieSettings = { ...DEFAULT_DIE, ...(file.die ?? {}) };

  if (version < 2) {
    elements = elements.map((el) => scaleElement(el, NM_PER_PX));
    grid = { ...grid, size: (file.grid?.size ?? 20) * NM_PER_PX };
    // v1 had no die of any kind, so an upgraded project stays unbounded.
    die = { ...DEFAULT_DIE };
  }

  return {
    version: 2,
    name: file.name || 'untitled',
    elements,
    layers: Array.isArray(file.layers) && file.layers.length ? file.layers : [],
    grid,
    die,
    unit: isUnit(file.unit) ? file.unit : DEFAULT_UNIT,
    savedAt: typeof file.savedAt === 'string' ? file.savedAt : new Date().toISOString(),
  };
}
