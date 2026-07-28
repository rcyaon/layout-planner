import { Minus, Plus, Maximize, Crosshair, AlertTriangle } from 'lucide-react';
import { useStore, outsideDie } from '../store/useStore';
import { DEFAULT_SCALE, UNIT_LABEL, clampScale, formatAuto, formatValue } from '../lib/units';

export default function StatusBar() {
  const view = useStore((s) => s.view);
  const cursor = useStore((s) => s.cursor);
  const tool = useStore((s) => s.tool);
  const activeLayer = useStore((s) => s.activeLayer);
  const layers = useStore((s) => s.layers);
  const grid = useStore((s) => s.grid);
  const unit = useStore((s) => s.unit);
  const die = useStore((s) => s.die);
  const count = useStore((s) => s.elements.length);
  const selCount = useStore((s) => s.selectedIds.length);
  const outside = useStore((s) => outsideDie(s.elements, s.die).length);

  const active = layers.find((l) => l.id === activeLayer);
  const u = UNIT_LABEL[unit];

  const zoomAround = (factor: number) => {
    const st = useStore.getState();
    const { width, height } = st.stageSize;
    const cx = width / 2;
    const cy = height / 2;
    const oldScale = st.view.scale;
    const newScale = clampScale(oldScale * factor);
    const wx = (cx - st.view.x) / oldScale;
    const wy = (cy - st.view.y) / oldScale;
    st.setView({ scale: newScale, x: cx - wx * newScale, y: cy - wy * newScale });
  };

  return (
    <div className="flex items-center gap-4 border-t border-edge bg-panel px-3 py-1 text-xs text-muted">
      <span className="text-ink">{tool}</span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: active?.color }} />
        {active?.name}
      </span>
      <span>
        Snap {grid.snap ? 'on' : 'off'} · {formatAuto(grid.size)}
      </span>
      <span>
        x {formatValue(cursor.x, unit)}, y {formatValue(cursor.y, unit)} {u}
      </span>
      <span>
        {die.mode === 'fixed'
          ? `Die ${formatValue(die.width, unit)} × ${formatValue(die.height, unit)} ${u}`
          : 'Infinite canvas'}
      </span>
      <span>
        {count} object{count === 1 ? '' : 's'}
        {selCount ? ` · ${selCount} selected` : ''}
      </span>
      {outside > 0 && (
        <span
          className="flex items-center gap-1 text-accent2"
          title="These objects stick out past the die boundary"
        >
          <AlertTriangle size={12} />
          {outside} outside die
        </span>
      )}
      <div className="ml-auto flex items-center gap-1">
        <button
          title="Zoom to fit"
          onClick={() => useStore.getState().fitTo()}
          className="rounded p-1 text-ink hover:bg-panelalt"
        >
          <Maximize size={14} />
        </button>
        <button
          title={die.mode === 'fixed' ? 'Fit the die' : 'Reset view'}
          onClick={() => useStore.getState().resetView()}
          className="rounded p-1 text-ink hover:bg-panelalt"
        >
          <Crosshair size={14} />
        </button>
        <button title="Zoom out" onClick={() => zoomAround(1 / 1.2)} className="rounded p-1 text-ink hover:bg-panelalt">
          <Minus size={14} />
        </button>
        {/* 100 % is the reference zoom where one pixel covers NM_PER_PX nm. */}
        <span className="w-14 text-center text-ink" title={`${(view.scale * 1000).toPrecision(3)} px per µm`}>
          {formatZoom(view.scale)}
        </span>
        <button title="Zoom in" onClick={() => zoomAround(1.2)} className="rounded p-1 text-ink hover:bg-panelalt">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

/** Zoom as a percentage of the reference scale, readable across 6 decades. */
function formatZoom(scale: number): string {
  const pct = (scale / DEFAULT_SCALE) * 100;
  if (pct >= 100) return `${Math.round(pct)}%`;
  if (pct >= 10) return `${pct.toFixed(0)}%`;
  if (pct >= 1) return `${pct.toFixed(1)}%`;
  return `${pct.toFixed(2)}%`;
}
