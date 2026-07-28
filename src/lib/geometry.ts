import type { Element } from '../types';

export function snap(value: number, size: number, enabled: boolean): number {
  if (!enabled || size <= 0) return value;
  return Math.round(value / size) * size;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Axis-aligned bounding box of an element in world coordinates. */
export function getBounds(el: Element): Bounds {
  switch (el.type) {
    case 'device':
    case 'text':
      return { x: el.x, y: el.y, width: elWidth(el), height: elHeight(el) };
    case 'shape':
      if (el.shape === 'rect' || el.shape === 'circle') {
        return { x: el.x, y: el.y, width: el.width, height: el.height };
      }
      return pointBounds(el.x, el.y, el.points);
    case 'wire':
    case 'measure':
      return pointBounds(el.x, el.y, el.points);
  }
}

function elWidth(el: Element): number {
  return 'width' in el ? el.width : 0;
}
function elHeight(el: Element): number {
  if (el.type === 'text') return el.fontSize * 1.6;
  return 'height' in el ? el.height : 0;
}

function pointBounds(ox: number, oy: number, points: number[]): Bounds {
  if (points.length < 2) return { x: ox, y: oy, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]);
    maxX = Math.max(maxX, points[i]);
    minY = Math.min(minY, points[i + 1]);
    maxY = Math.max(maxY, points[i + 1]);
  }
  return {
    x: ox + minX,
    y: oy + minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function boundsCenter(b: Bounds): { x: number; y: number } {
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Do two axis-aligned rectangles intersect? */
export function rectsIntersect(a: Bounds, b: Bounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** Is rect `inner` fully contained by `outer`? */
export function rectContains(outer: Bounds, inner: Bounds): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

export function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
