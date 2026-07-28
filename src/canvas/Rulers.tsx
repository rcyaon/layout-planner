import { useEffect, useRef } from 'react';
import type { ViewState } from '../types';

interface Props {
  width: number;
  height: number;
  view: ViewState;
  step: number;
}

const SIZE = 22;
const BG = '#241f18';
const FG = '#6d6350';
const TXT = '#9c9077';

/** Screen-space top + left rulers drawn on 2D canvases. */
export default function Rulers({ width, height, view, step }: Props) {
  const topRef = useRef<HTMLCanvasElement>(null);
  const leftRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    let major = step;
    while (major * view.scale < 60) major *= 5;

    // top ruler
    const top = topRef.current;
    if (top) {
      top.width = width * dpr;
      top.height = SIZE * dpr;
      const ctx = top.getContext('2d')!;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, width, SIZE);
      ctx.strokeStyle = FG;
      ctx.fillStyle = TXT;
      ctx.font = '9px sans-serif';
      ctx.beginPath();
      const startWorld = Math.floor((-view.x / view.scale) / major) * major;
      for (let wx = startWorld; wx * view.scale + view.x < width; wx += major) {
        const sx = wx * view.scale + view.x;
        if (sx < 0) continue;
        ctx.moveTo(sx, SIZE);
        ctx.lineTo(sx, SIZE - 8);
        ctx.fillText(String(Math.round(wx)), sx + 2, 10);
      }
      ctx.stroke();
    }

    // left ruler
    const left = leftRef.current;
    if (left) {
      left.width = SIZE * dpr;
      left.height = height * dpr;
      const ctx = left.getContext('2d')!;
      ctx.scale(dpr, dpr);
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, SIZE, height);
      ctx.strokeStyle = FG;
      ctx.fillStyle = TXT;
      ctx.font = '9px sans-serif';
      ctx.beginPath();
      const startWorld = Math.floor((-view.y / view.scale) / major) * major;
      for (let wy = startWorld; wy * view.scale + view.y < height; wy += major) {
        const sy = wy * view.scale + view.y;
        if (sy < 0) continue;
        ctx.moveTo(SIZE, sy);
        ctx.lineTo(SIZE - 8, sy);
        ctx.save();
        ctx.translate(10, sy + 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(String(Math.round(wy)), 0, 0);
        ctx.restore();
      }
      ctx.stroke();
    }
  }, [width, height, view.x, view.y, view.scale, step]);

  return (
    <>
      <canvas
        ref={topRef}
        style={{ position: 'absolute', top: 0, left: SIZE, width: width, height: SIZE, pointerEvents: 'none' }}
      />
      <canvas
        ref={leftRef}
        style={{ position: 'absolute', top: SIZE, left: 0, width: SIZE, height: height, pointerEvents: 'none' }}
      />
      <div style={{ position: 'absolute', top: 0, left: 0, width: SIZE, height: SIZE, background: BG, pointerEvents: 'none' }} />
    </>
  );
}
