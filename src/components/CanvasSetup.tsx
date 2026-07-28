import { useEffect, useRef, useState } from 'react';
import { Frame, ChevronDown, Infinity as InfinityIcon, Square } from 'lucide-react';
import { useStore, outsideDie } from '../store/useStore';
import type { Unit } from '../types';
import {
  UNITS,
  UNIT_LABEL,
  formatArea,
  formatAuto,
  formatValue,
  fromUnit,
  toUnit,
} from '../lib/units';

/** Snap steps offered in the dropdown, in nm. */
const GRID_STEPS = [1, 5, 10, 25, 50, 100, 250, 500, 1_000, 5_000];

/** Ready-made die sizes, in nm — the sort of block a planner starts from. */
const DIE_PRESETS: { label: string; width: number; height: number }[] = [
  { label: '50 × 50 µm', width: 50_000, height: 50_000 },
  { label: '100 × 100 µm', width: 100_000, height: 100_000 },
  { label: '250 × 250 µm', width: 250_000, height: 250_000 },
  { label: '500 × 500 µm', width: 500_000, height: 500_000 },
  { label: '1 × 1 mm', width: 1_000_000, height: 1_000_000 },
  { label: '2 × 2 mm', width: 2_000_000, height: 2_000_000 },
];

/**
 * A length input that edits nanometres but shows the project's display unit.
 * The text is kept as typed while focused so an in-progress "0.2" is not
 * rewritten to "0" between keystrokes.
 */
function LengthField({
  value,
  unit,
  onCommit,
  title,
}: {
  value: number;
  unit: Unit;
  onCommit: (nm: number) => void;
  title?: string;
}) {
  const [text, setText] = useState(() => formatValue(value, unit));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!editing) setText(formatValue(value, unit));
  }, [value, unit, editing]);

  const commit = () => {
    setEditing(false);
    const v = Number(text);
    if (Number.isFinite(v) && v > 0) onCommit(Math.max(1, Math.round(fromUnit(v, unit))));
    else setText(formatValue(value, unit));
  };

  return (
    <div className="flex items-center rounded-lg border border-edge bg-panelalt focus-within:border-accent">
      <input
        type="number"
        min={0}
        step={toUnit(1, unit)}
        value={text}
        title={title}
        onFocus={() => setEditing(true)}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        className="w-full min-w-0 bg-transparent px-2 py-1 text-right text-sm text-ink outline-none"
      />
      <span className="pr-2 text-[11px] text-muted">{UNIT_LABEL[unit]}</span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 py-1 text-sm">
      <span className="w-20 shrink-0 text-muted">{label}</span>
      {children}
    </label>
  );
}

/**
 * Popover for everything that describes the drawing surface rather than what is
 * on it: the die (bounded or infinite), the snap grid, and the unit lengths are
 * shown in.
 */
export default function CanvasSetup() {
  const die = useStore((s) => s.die);
  const grid = useStore((s) => s.grid);
  const unit = useStore((s) => s.unit);
  const setDie = useStore((s) => s.setDie);
  const setGrid = useStore((s) => s.setGrid);
  const setUnit = useStore((s) => s.setUnit);
  const outside = useStore((s) => outsideDie(s.elements, s.die).length);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const toggle = () => {
    if (!open) {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen((v) => !v);
  };

  const fixed = die.mode === 'fixed';

  /** Switching to a bounded die is only useful if you can see the die. */
  const setMode = (mode: 'infinite' | 'fixed') => {
    setDie({ mode });
    if (mode === 'fixed') {
      useStore.getState().fitTo({ x: 0, y: 0, width: die.width, height: die.height });
    }
  };

  const applyPreset = (width: number, height: number) => {
    setDie({ mode: 'fixed', width, height });
    useStore.getState().fitTo({ x: 0, y: 0, width, height });
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        title="Canvas setup — die area, grid and units"
        className={
          'flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm transition-colors ' +
          (open ? 'bg-panelalt text-ink' : 'text-ink hover:bg-panelalt')
        }
      >
        <Frame size={16} />
        <span className="hidden whitespace-nowrap text-[13px] font-medium lg:inline">
          {fixed ? `${formatValue(die.width, unit)} × ${formatValue(die.height, unit)} ${UNIT_LABEL[unit]}` : 'Infinite canvas'}
        </span>
        <ChevronDown size={13} />
      </button>

      {open && pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 w-72 rounded-xl border border-edge bg-panel p-3 shadow-pop"
            style={{ top: pos.top, left: pos.left }}
          >
            {/* --- die area ------------------------------------------------ */}
            <div className="mb-1.5 text-xs font-semibold tracking-wide text-muted">Drawing area</div>
            <div className="mb-2 grid grid-cols-2 gap-1.5">
              {(
                [
                  { mode: 'infinite' as const, icon: InfinityIcon, label: 'Infinite' },
                  { mode: 'fixed' as const, icon: Square, label: 'Fixed die' },
                ]
              ).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setMode(mode)}
                  className={
                    'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm transition-colors ' +
                    (die.mode === mode
                      ? 'border-accent bg-accent/15 text-ink'
                      : 'border-edge text-muted hover:bg-panelalt')
                  }
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            {fixed ? (
              <>
                <Row label="Width">
                  <LengthField value={die.width} unit={unit} onCommit={(nm) => setDie({ width: nm })} />
                </Row>
                <Row label="Height">
                  <LengthField value={die.height} unit={unit} onCommit={(nm) => setDie({ height: nm })} />
                </Row>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {DIE_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => applyPreset(p.width, p.height)}
                      className={
                        'rounded-md border px-1.5 py-0.5 text-[11px] transition-colors ' +
                        (die.width === p.width && die.height === p.height
                          ? 'border-accent bg-accent/15 text-ink'
                          : 'border-edge text-muted hover:bg-panelalt')
                      }
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 text-[11px] leading-snug text-muted">
                  Area {formatArea(die.width * die.height, unit)}
                  {outside > 0 && (
                    <span className="text-accent2">
                      {' · '}
                      {outside} object{outside === 1 ? '' : 's'} outside the die
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="text-[11px] leading-snug text-muted">
                The canvas extends in every direction. Switch to a fixed die when you already
                know the area you have to fit into.
              </div>
            )}

            <div className="my-2.5 h-px bg-edge" />

            {/* --- grid ---------------------------------------------------- */}
            <div className="mb-1.5 text-xs font-semibold tracking-wide text-muted">Grid</div>
            <Row label="Snap step">
              <select
                value={grid.size}
                onChange={(e) => setGrid({ size: Number(e.target.value) })}
                className="w-full rounded-lg border border-edge bg-panelalt px-2 py-1 text-sm text-ink outline-none focus:border-accent"
              >
                {/* A snap step is quoted in whatever unit suits it — writing
                    1 nm as "0.001 µm" helps nobody. */}
                {GRID_STEPS.map((s) => (
                  <option key={s} value={s}>
                    {formatAuto(s)}
                  </option>
                ))}
              </select>
            </Row>
            <div className="flex flex-wrap gap-x-4">
              {(
                [
                  ['snap', 'Snap to grid'],
                  ['visible', 'Show grid'],
                  ['showRulers', 'Show rulers'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-1.5 py-0.5 text-sm">
                  <input
                    type="checkbox"
                    checked={grid[key]}
                    onChange={(e) => setGrid({ [key]: e.target.checked })}
                    className="h-3.5 w-3.5 accent-accent"
                  />
                  <span className="text-ink">{label}</span>
                </label>
              ))}
            </div>

            <div className="my-2.5 h-px bg-edge" />

            {/* --- units --------------------------------------------------- */}
            <div className="mb-1.5 text-xs font-semibold tracking-wide text-muted">Display unit</div>
            <div className="grid grid-cols-3 gap-1.5">
              {UNITS.map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={
                    'rounded-lg border px-2 py-1 text-sm transition-colors ' +
                    (unit === u
                      ? 'border-accent bg-accent/15 text-ink'
                      : 'border-edge text-muted hover:bg-panelalt')
                  }
                >
                  {UNIT_LABEL[u]}
                </button>
              ))}
            </div>
            <div className="mt-1.5 text-[11px] leading-snug text-muted">
              Coordinates are stored in nanometres whichever unit is shown.
            </div>
          </div>
        </>
      )}
    </>
  );
}
