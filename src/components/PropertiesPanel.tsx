import type { ReactNode } from 'react';
import { useStore } from '../store/useStore';
import type { Element, NetlistInfo } from '../types';
import { DEVICE_DEF_MAP } from '../lib/componentDefs';

// --- small field primitives -------------------------------------------------

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-2 flex items-center justify-between gap-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="flex items-center gap-1">{children}</span>
    </label>
  );
}

function Num({
  value,
  onCommit,
  step = 1,
  w = 'w-20',
}: {
  value: number;
  onCommit: (v: number) => void;
  step?: number;
  w?: string;
}) {
  return (
    <input
      type="number"
      step={step}
      value={Math.round(value * 100) / 100}
      onFocus={() => useStore.getState().pushHistory()}
      onChange={(e) => onCommit(parseFloat(e.target.value) || 0)}
      className={`${w} rounded border border-edge bg-panelalt px-2 py-1 text-right text-ink outline-none focus:border-accent`}
    />
  );
}

function TextIn({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onFocus={() => useStore.getState().pushHistory()}
      onChange={(e) => onCommit(e.target.value)}
      className="w-36 rounded border border-edge bg-panelalt px-2 py-1 text-ink outline-none focus:border-accent"
    />
  );
}

function Color({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  return (
    <input
      type="color"
      value={value.length === 7 ? value : '#e2e8f0'}
      onFocus={() => useStore.getState().pushHistory()}
      onChange={(e) => onCommit(e.target.value)}
      className="h-7 w-10 cursor-pointer rounded border border-edge bg-transparent p-0"
    />
  );
}

// --- panel ------------------------------------------------------------------

export default function PropertiesPanel() {
  const selectedIds = useStore((s) => s.selectedIds);
  const elements = useStore((s) => s.elements);
  const grid = useStore((s) => s.grid);
  const layers = useStore((s) => s.layers);
  const projectName = useStore((s) => s.projectName);

  const selected = elements.filter((e) => selectedIds.includes(e.id));

  if (selected.length === 0) return <CanvasSettings grid={grid} projectName={projectName} count={elements.length} />;
  if (selected.length > 1) return <MultiSettings count={selected.length} />;

  return <SingleEditor el={selected[0]} layers={layers} />;
}

function CanvasSettings({
  grid,
  projectName,
  count,
}: {
  grid: { size: number; snap: boolean; visible: boolean; showRulers: boolean };
  projectName: string;
  count: number;
}) {
  const setGrid = useStore((s) => s.setGrid);
  const setProjectName = useStore((s) => s.setProjectName);
  return (
    <div className="p-3">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Project</div>
      <Row label="Name">
        <TextIn value={projectName} onCommit={(v) => setProjectName(v)} />
      </Row>
      <div className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">Canvas & Grid</div>
      <Row label="Grid spacing">
        <Num value={grid.size} onCommit={(v) => setGrid({ size: Math.max(2, v) })} />
      </Row>
      <Toggle label="Snap to grid" checked={grid.snap} onChange={(v) => setGrid({ snap: v })} />
      <Toggle label="Show grid" checked={grid.visible} onChange={(v) => setGrid({ visible: v })} />
      <Toggle label="Show rulers" checked={grid.showRulers} onChange={(v) => setGrid({ showRulers: v })} />
      <div className="mt-6 text-[12px] leading-relaxed text-muted">
        {count} object{count === 1 ? '' : 's'} on canvas. Select an object to edit its properties, or drag a component
        from the library to begin.
      </div>
    </div>
  );
}

function MultiSettings({ count }: { count: number }) {
  const st = useStore.getState;
  return (
    <div className="p-3">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{count} objects selected</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Btn onClick={() => st().group()}>Group</Btn>
        <Btn onClick={() => st().ungroup()}>Ungroup</Btn>
        <Btn onClick={() => st().align('left')}>Align L</Btn>
        <Btn onClick={() => st().align('right')}>Align R</Btn>
        <Btn onClick={() => st().align('top')}>Align T</Btn>
        <Btn onClick={() => st().align('bottom')}>Align B</Btn>
        <Btn onClick={() => st().distribute('h')}>Dist H</Btn>
        <Btn onClick={() => st().distribute('v')}>Dist V</Btn>
        <Btn onClick={() => st().duplicateSelected()}>Duplicate</Btn>
        <Btn onClick={() => st().removeSelected()}>Delete</Btn>
      </div>
      <div className="mt-4 text-[12px] leading-relaxed text-muted">
        Distribute needs 3+ objects. Use the toolbar for more alignment options.
      </div>
    </div>
  );
}

function SingleEditor({ el, layers }: { el: Element; layers: { id: string; name: string; color: string }[] }) {
  const update = (patch: Record<string, unknown>) => useStore.getState().updateElement(el.id, patch);
  const title =
    el.type === 'device'
      ? DEVICE_DEF_MAP[el.kind]?.name ?? el.kind
      : el.type === 'shape'
        ? el.shape
        : el.type === 'wire'
          ? 'Wire'
          : el.type === 'text'
            ? 'Text'
            : 'Measurement';

  return (
    <div className="scroll-thin h-full overflow-y-auto p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</span>
        <button
          onClick={() => useStore.getState().toggleLockSelected()}
          className={'text-xs ' + (el.locked ? 'text-amber-400' : 'text-muted hover:text-ink')}
        >
          {el.locked ? 'Locked' : 'Unlocked'}
        </button>
      </div>

      {el.type !== 'text' && (
        <Row label="Label">
          <TextIn value={el.label} onCommit={(v) => update({ label: v })} />
        </Row>
      )}

      <Row label="X">
        <Num value={el.x} onCommit={(v) => update({ x: v })} />
      </Row>
      <Row label="Y">
        <Num value={el.y} onCommit={(v) => update({ y: v })} />
      </Row>

      {'width' in el && el.type !== 'text' && (
        <Row label="Width">
          <Num value={el.width} onCommit={(v) => update({ width: Math.max(2, v) })} />
        </Row>
      )}
      {'height' in el && (
        <Row label="Height">
          <Num value={el.height} onCommit={(v) => update({ height: Math.max(2, v) })} />
        </Row>
      )}

      {(el.type === 'device' || el.type === 'text' || el.type === 'shape') && (
        <Row label="Rotation">
          <Num value={el.rotation} step={90} onCommit={(v) => update({ rotation: v })} />
        </Row>
      )}

      {el.type === 'text' && (
        <>
          <div className="mb-1 text-sm text-muted">Text</div>
          <textarea
            value={el.text}
            onFocus={() => useStore.getState().pushHistory()}
            onChange={(e) => update({ text: e.target.value })}
            rows={2}
            className="mb-2 w-full resize-y rounded border border-edge bg-panelalt px-2 py-1 text-sm text-ink outline-none focus:border-accent"
          />
          <Row label="Font size">
            <Num value={el.fontSize} onCommit={(v) => update({ fontSize: Math.max(6, v) })} />
          </Row>
          <Row label="Box width">
            <Num value={el.width} onCommit={(v) => update({ width: Math.max(20, v) })} />
          </Row>
          <Toggle label="Callout box" checked={el.callout} onChange={(v) => update({ callout: v })} />
          <Row label="Color">
            <Color value={el.color} onCommit={(v) => update({ color: v })} />
          </Row>
        </>
      )}

      {el.type === 'device' && el.kind === 'block' && (
        <Row label="Metal layer">
          <select
            value={el.layer ?? ''}
            onChange={(e) => {
              const id = e.target.value;
              useStore.getState().pushHistory();
              const lc = layers.find((l) => l.id === id)?.color;
              update({ layer: id, ...(lc ? { color: lc } : {}) });
            }}
            className="rounded border border-edge bg-panelalt px-2 py-1 text-sm text-ink outline-none focus:border-accent"
          >
            {layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Row>
      )}

      {el.type === 'device' && el.netlist && <NetlistInfoBlock info={el.netlist} />}

      {(el.type === 'wire' || el.type === 'shape') && (
        <Row label="Stroke width">
          <Num value={el.strokeWidth} onCommit={(v) => update({ strokeWidth: Math.max(0.5, v) })} />
        </Row>
      )}

      {el.type === 'shape' && el.shape !== 'line' && el.shape !== 'arrow' && el.shape !== 'polyline' && (
        <Row label="Fill">
          <Color value={el.fill === 'transparent' ? '#000000' : el.fill} onCommit={(v) => update({ fill: v })} />
        </Row>
      )}

      {(el.type === 'wire' || el.type === 'shape') && (
        <Row label="Layer">
          <select
            value={el.type === 'wire' ? el.layer : el.layer ?? ''}
            onChange={(e) => {
              useStore.getState().pushHistory();
              update({ layer: e.target.value === '' ? null : e.target.value });
            }}
            className="rounded border border-edge bg-panelalt px-2 py-1 text-sm text-ink outline-none focus:border-accent"
          >
            {el.type === 'shape' && <option value="">None</option>}
            {layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Row>
      )}

      <div className="mb-1 mt-3 text-sm text-muted">Notes</div>
      <textarea
        value={el.notes}
        onFocus={() => useStore.getState().pushHistory()}
        onChange={(e) => update({ notes: e.target.value })}
        rows={3}
        placeholder="Matching, symmetry, bias context…"
        className="w-full resize-y rounded border border-edge bg-panelalt px-2 py-1 text-sm text-ink outline-none focus:border-accent"
      />

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Btn onClick={() => useStore.getState().duplicateSelected()}>Duplicate</Btn>
        <Btn onClick={() => useStore.getState().removeSelected()}>Delete</Btn>
      </div>
    </div>
  );
}

/** Read-only connectivity for devices generated by the netlist importer. */
function NetlistInfoBlock({ info }: { info: NetlistInfo }) {
  const params = Object.entries(info.params);
  return (
    <div className="mt-3 rounded-lg border border-edge bg-panelalt p-2">
      <div className="mb-1.5 flex items-baseline gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Netlist</span>
        <span className="truncate text-[11px] text-muted" title={info.cell}>
          {info.cell}
        </span>
      </div>
      <div className="mb-1 truncate font-mono text-[11px] text-ink" title={`${info.instance} ${info.model}`}>
        {info.instance}
        {info.model ? ` · ${info.model}` : ''}
      </div>
      {info.nets.map((n) => (
        <div key={n.terminal} className="flex justify-between gap-2 font-mono text-[11px] text-muted">
          <span>{n.terminal}</span>
          <span className="truncate text-ink" title={n.net}>
            {n.net}
          </span>
        </div>
      ))}
      {params.length > 0 && (
        <div className="mt-1 break-words font-mono text-[11px] text-muted">
          {params.map(([k, v]) => `${k}=${v}`).join('  ')}
        </div>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="mb-2 flex cursor-pointer items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-accent" />
    </label>
  );
}

function Btn({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded border border-edge bg-panel px-2 py-1.5 text-sm text-ink hover:bg-panelalt"
    >
      {children}
    </button>
  );
}
