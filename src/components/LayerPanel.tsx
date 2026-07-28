import { Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function LayerPanel() {
  const layers = useStore((s) => s.layers);
  const activeLayer = useStore((s) => s.activeLayer);
  const setLayer = useStore((s) => s.setLayer);
  const setActiveLayer = useStore((s) => s.setActiveLayer);

  return (
    <div className="shrink-0 border-t border-edge">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Metal Layers</div>
      {/* Capped so a long stack scrolls here instead of squeezing the library.
          pt-1 keeps the scroll edge from clipping the selected row's ring. */}
      <div className="scroll-thin flex max-h-56 flex-col gap-1 overflow-y-auto px-2 pb-3 pt-1">
        {layers.map((l) => {
          const active = l.id === activeLayer;
          return (
            <div
              key={l.id}
              onClick={() => setActiveLayer(l.id)}
              className={
                'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 ' +
                (active ? 'bg-accent/20 ring-1 ring-accent/50' : 'hover:bg-panelalt')
              }
            >
              <input
                type="color"
                value={l.color}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setLayer(l.id, { color: e.target.value })}
                className="h-5 w-5 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                title="Layer color"
              />
              <span className="flex-1 text-sm text-ink">{l.name}</span>
              <button
                title={l.visible ? 'Hide layer' : 'Show layer'}
                onClick={(e) => {
                  e.stopPropagation();
                  setLayer(l.id, { visible: !l.visible });
                }}
                className="text-muted hover:text-ink"
              >
                {l.visible ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
              <button
                title={l.locked ? 'Unlock layer' : 'Lock layer'}
                onClick={(e) => {
                  e.stopPropagation();
                  setLayer(l.id, { locked: !l.locked });
                }}
                className={l.locked ? 'text-amber-400' : 'text-muted hover:text-ink'}
              >
                {l.locked ? <Lock size={15} /> : <Unlock size={15} />}
              </button>
            </div>
          );
        })}
      </div>
      <div className="px-3 pb-2 text-[11px] leading-snug text-muted">
        New wires and blocks are added to the active layer and take its color. Recolor a layer to update
        everything on it.
      </div>
    </div>
  );
}
