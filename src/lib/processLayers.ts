// Simplified analog-layout "process" colors, loosely inspired by the stipple
// palette of a Virtuoso / open-PDK layer stack. These are for the DEVICE glyphs;
// the M1–M3 routing layers the user configures are separate (see the store).

export const PLAYER = {
  nwell: '#c7a94f', // n-well (tan)
  nactive: '#37c26b', // n diffusion / active (green)
  pactive: '#e0a13a', // p diffusion / active (amber)
  poly: '#ff6b81', // poly gate (pink/red)
  contact: '#eceef6', // contact / cut (near-white)
  met1: '#4aa3ff', // metal 1 (blue)
  met2: '#c678dd', // metal 2 (purple)
  res: '#e0863a', // resistor body (orange)
  block: '#93a0bf', // generic block (slate)
} as const;

export type PatternKind = 'dot' | 'diagUp' | 'diagDown' | 'cross' | 'wash';

const cache = new Map<string, HTMLCanvasElement>();

/**
 * Returns a cached 8×8 tile canvas with a translucent wash plus a stipple/hatch
 * in `color`, used as a Konva fillPatternImage so device layers read like a
 * real layout stack.
 */
export function pattern(color: string, kind: PatternKind): HTMLCanvasElement | undefined {
  if (typeof document === 'undefined') return undefined;
  const key = color + kind;
  const hit = cache.get(key);
  if (hit) return hit;
  const s = 8;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d');
  if (!ctx) return undefined;

  ctx.fillStyle = color + '26'; // faint wash
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1;

  if (kind === 'dot') {
    ctx.globalAlpha = 0.85;
    for (const [x, y] of [[2, 2], [6, 6]]) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'diagUp') {
    ctx.beginPath();
    ctx.moveTo(0, s);
    ctx.lineTo(s, 0);
    ctx.stroke();
  } else if (kind === 'diagDown') {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(s, s);
    ctx.stroke();
  } else if (kind === 'cross') {
    ctx.beginPath();
    ctx.moveTo(0, s);
    ctx.lineTo(s, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(s, s);
    ctx.stroke();
  }
  // 'wash' = just the translucent fill

  cache.set(key, c);
  return c;
}
