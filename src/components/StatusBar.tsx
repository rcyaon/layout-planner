import { Minus, Plus, Maximize, Crosshair } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getBounds } from '../lib/geometry';

export default function StatusBar() {
  const view = useStore((s) => s.view);
  const cursor = useStore((s) => s.cursor);
  const tool = useStore((s) => s.tool);
  const activeLayer = useStore((s) => s.activeLayer);
  const layers = useStore((s) => s.layers);
  const grid = useStore((s) => s.grid);
  const count = useStore((s) => s.elements.length);
  const selCount = useStore((s) => s.selectedIds.length);

  const active = layers.find((l) => l.id === activeLayer);

  const zoomAround = (factor: number) => {
    const st = useStore.getState();
    const { width, height } = st.stageSize;
    const cx = width / 2;
    const cy = height / 2;
    const oldScale = st.view.scale;
    let newScale = Math.max(0.05, Math.min(20, oldScale * factor));
    const wx = (cx - st.view.x) / oldScale;
    const wy = (cy - st.view.y) / oldScale;
    st.setView({ scale: newScale, x: cx - wx * newScale, y: cy - wy * newScale });
  };

  const reset = () => useStore.getState().setView({ x: 0, y: 0, scale: 1 });

  const fit = () => {
    const st = useStore.getState();
    if (!st.elements.length) return reset();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const el of st.elements) {
      const b = getBounds(el);
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    }
    const pad = 60;
    const bw = maxX - minX || 1;
    const bh = maxY - minY || 1;
    const { width, height } = st.stageSize;
    const scale = Math.max(0.05, Math.min(8, Math.min((width - pad) / bw, (height - pad) / bh)));
    st.setView({
      scale,
      x: width / 2 - ((minX + maxX) / 2) * scale,
      y: height / 2 - ((minY + maxY) / 2) * scale,
    });
  };

  return (
    <div className="flex items-center gap-4 border-t border-edge bg-panel px-3 py-1 text-xs text-muted">
      <span className="capitalize text-ink">{tool}</span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: active?.color }} />
        {active?.name}
      </span>
      <span>Snap {grid.snap ? 'on' : 'off'} · {grid.size}u</span>
      <span>
        x {cursor.x}, y {cursor.y}
      </span>
      <span>
        {count} object{count === 1 ? '' : 's'}
        {selCount ? ` · ${selCount} selected` : ''}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <button title="Zoom to fit" onClick={fit} className="rounded p-1 text-ink hover:bg-panelalt">
          <Maximize size={14} />
        </button>
        <button title="Reset view" onClick={reset} className="rounded p-1 text-ink hover:bg-panelalt">
          <Crosshair size={14} />
        </button>
        <button title="Zoom out" onClick={() => zoomAround(1 / 1.2)} className="rounded p-1 text-ink hover:bg-panelalt">
          <Minus size={14} />
        </button>
        <span className="w-12 text-center text-ink">{Math.round(view.scale * 100)}%</span>
        <button title="Zoom in" onClick={() => zoomAround(1.2)} className="rounded p-1 text-ink hover:bg-panelalt">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
