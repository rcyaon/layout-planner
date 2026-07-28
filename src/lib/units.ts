// ---------------------------------------------------------------------------
// Length units.
//
// One world unit is one nanometre — the same convention Virtuoso and most PDKs
// use for their database unit. Element coordinates and sizes are therefore
// integers in nm, and the display unit (nm / µm / mm) only affects what the UI
// prints and parses, never what is stored.
//
// `view.scale` is screen pixels per nanometre, so it is a very small number.
// `DEFAULT_SCALE` is the reference the zoom percentage is quoted against.
// ---------------------------------------------------------------------------

export type Unit = 'nm' | 'um' | 'mm';

export const UNITS: Unit[] = ['nm', 'um', 'mm'];

/** Nanometres in one of each display unit. */
export const UNIT_NM: Record<Unit, number> = {
  nm: 1,
  um: 1_000,
  mm: 1_000_000,
};

/** How each unit is spelled on screen. */
export const UNIT_LABEL: Record<Unit, string> = {
  nm: 'nm',
  um: 'µm',
  mm: 'mm',
};

/** Nanometres per screen pixel at 100 % zoom. */
export const NM_PER_PX = 25;

/** Pixels per nanometre at 100 % zoom — the zoom readout's reference point. */
export const DEFAULT_SCALE = 1 / NM_PER_PX;

/** ~0.05 % zoom: about 40 mm across a wide viewport. */
export const MIN_SCALE = DEFAULT_SCALE / 2000;
/** 50 000 % zoom: a single nanometre is 20 px. */
export const MAX_SCALE = DEFAULT_SCALE * 500;

export const clampScale = (s: number) => Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));

/**
 * A length in nm that renders as `n` pixels of ink at 100 % zoom. Used for the
 * parts of a drawing that are ink rather than geometry — stroke widths, label
 * type sizes, symbol detail — which have no meaningful size in nanometres but
 * still have to scale with the layout when you zoom.
 */
export const px = (n: number): number => n * NM_PER_PX;

// --- conversion ------------------------------------------------------------

export const toUnit = (nm: number, unit: Unit): number => nm / UNIT_NM[unit];
export const fromUnit = (value: number, unit: Unit): number => value * UNIT_NM[unit];

/** The unit a length reads most naturally in. */
export function autoUnit(nm: number): Unit {
  const a = Math.abs(nm);
  if (a >= 1_000_000) return 'mm';
  if (a >= 1_000) return 'um';
  return 'nm';
}

// --- formatting ------------------------------------------------------------

/** Decimals worth printing before the value stops meaning anything in nm. */
const MAX_DP: Record<Unit, number> = { nm: 1, um: 4, mm: 6 };

function trim(s: string): string {
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

/** A length in `unit`, without a suffix. */
export function formatValue(nm: number, unit: Unit): string {
  return trim(toUnit(nm, unit).toFixed(MAX_DP[unit]));
}

/** A length in `unit`, with its suffix — e.g. `formatLength(1500, 'um')` → `1.5 µm`. */
export function formatLength(nm: number, unit: Unit): string {
  return `${formatValue(nm, unit)} ${UNIT_LABEL[unit]}`;
}

/** Same, but picking whichever unit reads best for this particular value. */
export function formatAuto(nm: number): string {
  return formatLength(nm, autoUnit(nm));
}

/** An area, quoted in the square of `unit`. */
export function formatArea(nmSq: number, unit: Unit): string {
  const per = UNIT_NM[unit] ** 2;
  const v = nmSq / per;
  const dp = v >= 100 ? 0 : v >= 10 ? 1 : 2;
  return `${trim(v.toFixed(dp))} ${UNIT_LABEL[unit]}²`;
}

/** Read a user-typed number in `unit` back into nanometres. `null` if unusable. */
export function parseLength(text: string, unit: Unit): number | null {
  const v = Number(String(text).trim());
  if (!Number.isFinite(v)) return null;
  return fromUnit(v, unit);
}

// --- grid / ruler stepping -------------------------------------------------

/** The smallest 1-2-5-per-decade step that is at least `min`. */
export function niceStep(min: number): number {
  if (!(min > 0)) return 1;
  const decade = 10 ** Math.floor(Math.log10(min));
  for (const m of [1, 2, 5]) {
    if (decade * m >= min - 1e-9) return decade * m;
  }
  return decade * 10;
}

/**
 * The grid step to actually draw: `base` (the snap step) multiplied up by whole
 * 1-2-5 factors until the lines are at least `minPx` apart on screen.
 */
export function visibleStep(base: number, scale: number, minPx: number): number {
  if (base * scale >= minPx) return base;
  const wanted = minPx / scale;
  // Stay on multiples of the snap step so drawn lines still land on it.
  const factor = Math.max(1, niceStep(wanted / base));
  return base * factor;
}
