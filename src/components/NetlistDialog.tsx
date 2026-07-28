import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { AlertTriangle, CircuitBoard, FileUp, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { parseNetlist, summarizeCell } from '../lib/netlist';
import type { NetlistCell } from '../lib/netlist';
import { DEFAULT_IMPORT_OPTIONS, buildNetlistElements } from '../lib/netlistImport';

const EXAMPLE = `* 5-transistor OTA
.subckt ota vinp vinn vout vbias vdd vss
MP1 n1   n1   vdd  vdd  pmos W=4u  L=0.5u m=2
MP2 vout n1   vdd  vdd  pmos W=4u  L=0.5u m=2
MN1 n1   vinp ntail vss nmos W=8u  L=0.5u
MN2 vout vinn ntail vss nmos W=8u  L=0.5u
MB1 ntail vbias vss vss nmos W=16u L=1u  m=4
CL  vout  vss  1p
.ends ota

XOTA1 inp inn out vb vdd vss ota
RFB out inn 20k
CC  out  inn 500f
`;

function Check({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 py-1 text-sm" title={hint}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
      />
      <span className="text-ink">{label}</span>
    </label>
  );
}

export default function NetlistDialog() {
  const open = useStore((s) => s.dialog === 'netlist');
  const setDialog = useStore((s) => s.setDialog);

  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [opts, setOpts] = useState(DEFAULT_IMPORT_OPTIONS);
  const [selected, setSelected] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => (text.trim() ? parseNetlist(text) : null), [text]);

  // default to every cell that has devices whenever a new netlist is parsed
  useEffect(() => {
    setSelected(parsed ? parsed.cells.map((c) => c.name) : []);
  }, [parsed]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDialog(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setDialog]);

  if (!open) return null;

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ''));
      setFileName(file.name);
    };
    reader.readAsText(file);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) readFile(f);
    e.target.value = '';
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) readFile(f);
  };

  const toggleCell = (name: string) =>
    setSelected((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));

  const chosen: NetlistCell[] = parsed ? parsed.cells.filter((c) => selected.includes(c.name)) : [];
  const deviceCount = chosen.reduce((n, c) => n + c.devices.length, 0);

  const doImport = () => {
    if (!parsed || !deviceCount) return;
    const st = useStore.getState();
    // place the new devices just inside the top-left of the current viewport
    const originX = (60 - st.view.x) / st.view.scale;
    const originY = (60 - st.view.y) / st.view.scale;
    const active = st.layers.find((l) => l.id === st.activeLayer);
    const elements = buildNetlistElements(
      parsed,
      { ...opts, cells: selected },
      {
        originX,
        originY,
        gridSize: st.grid.size,
        snap: st.grid.snap,
        blockLayer: active ? { id: active.id, color: active.color } : undefined,
      },
    );
    st.addElements(elements);
    st.setTool('select');
    setDialog(null);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/25 p-6"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setDialog(null);
        // keep canvas shortcuts (delete, tool keys) from firing behind the modal
        e.stopPropagation();
      }}
    >
      <div className="absolute inset-0" onClick={() => setDialog(null)} />
      <div className="relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-edge bg-panel shadow-pop">
        {/* header */}
        <div className="flex items-center gap-2 border-b border-edge px-4 py-3">
          <CircuitBoard size={17} className="text-accent" />
          <span className="font-display text-[15px] font-bold text-ink">Import netlist</span>
          <span className="text-xs text-muted">SPICE / CDL — generates planning devices</span>
          <button
            onClick={() => setDialog(null)}
            className="ml-auto rounded-lg p-1 text-muted hover:bg-panelalt hover:text-ink"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-2 scroll-thin">
          {/* --- source ------------------------------------------------- */}
          <div className="flex min-h-0 flex-col">
            <div className="mb-2 text-xs font-semibold tracking-wide text-muted">Netlist source</div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={
                'mb-2 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-4 text-sm transition-colors ' +
                (dragging ? 'border-accent bg-panelalt text-ink' : 'border-edge text-muted')
              }
            >
              <FileUp size={16} />
              <span>Drop a .sp / .cir / .net file, or</span>
              <button
                onClick={() => fileInput.current?.click()}
                className="rounded-lg border border-edge bg-panel px-2 py-1 text-ink hover:bg-panelalt"
              >
                choose a file
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".sp,.spi,.spc,.cir,.net,.ckt,.cdl,.scs,.txt,text/plain"
                className="hidden"
                onChange={onPick}
              />
            </div>

            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setFileName('');
              }}
              spellCheck={false}
              placeholder="…or paste the netlist here"
              className="scroll-thin h-64 w-full resize-none rounded-xl border border-edge bg-panelalt p-2.5 font-mono text-[12px] leading-relaxed text-ink outline-none focus:border-accent"
            />
            <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
              {fileName ? <span className="truncate">{fileName}</span> : <span>No file loaded</span>}
              <button onClick={() => setText(EXAMPLE)} className="ml-auto text-accent hover:underline">
                Load example
              </button>
              {text && (
                <button
                  onClick={() => {
                    setText('');
                    setFileName('');
                  }}
                  className="hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* --- preview + options -------------------------------------- */}
          <div className="flex min-h-0 flex-col">
            <div className="mb-2 text-xs font-semibold tracking-wide text-muted">
              Cells to generate
            </div>

            {!parsed && (
              <div className="rounded-xl border border-edge bg-panelalt p-3 text-[12px] leading-relaxed text-muted">
                Devices are read from <code>M</code>, <code>R</code>, <code>C</code> and subcircuit-wrapped{' '}
                <code>X</code> instances. Each <code>.subckt</code> becomes its own cell you can place separately;
                instances of a locally defined subcircuit are placed as blocks.
              </div>
            )}

            {parsed && (
              <>
                {parsed.title && (
                  <div className="mb-2 truncate text-[12px] text-muted" title={parsed.title}>
                    {parsed.title}
                  </div>
                )}
                <div className="scroll-thin max-h-48 overflow-y-auto rounded-xl border border-edge bg-panelalt p-1">
                  {parsed.cells.length === 0 && (
                    <div className="p-2 text-[12px] text-muted">No devices found in this netlist.</div>
                  )}
                  {parsed.cells.map((c) => (
                    <label
                      key={c.name}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-panel"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(c.name)}
                        onChange={() => toggleCell(c.name)}
                        className="h-4 w-4 accent-accent"
                      />
                      <span className="truncate font-medium text-ink">{c.name}</span>
                      <span className="ml-auto shrink-0 text-[11px] text-muted">{summarizeCell(c)}</span>
                    </label>
                  ))}
                </div>

                {parsed.warnings.length > 0 && (
                  <details className="mt-2 rounded-xl border border-edge bg-panelalt px-2.5 py-1.5">
                    <summary className="flex cursor-pointer items-center gap-1.5 text-[12px] text-muted">
                      <AlertTriangle size={13} className="text-accent2" />
                      {parsed.warnings.length} warning{parsed.warnings.length === 1 ? '' : 's'}
                    </summary>
                    <ul className="scroll-thin mt-1 max-h-24 list-disc overflow-y-auto pl-5 text-[11px] leading-relaxed text-muted">
                      {parsed.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </details>
                )}

                <div className="mb-1 mt-4 text-xs font-semibold tracking-wide text-muted">Placement</div>
                <Check
                  label="Scale devices by W/L and passive values"
                  checked={opts.scaleToSize}
                  onChange={(v) => setOpts((o) => ({ ...o, scaleToSize: v }))}
                  hint="Off = every device uses the library default size"
                />
                <Check
                  label="Group each cell"
                  checked={opts.groupCells}
                  onChange={(v) => setOpts((o) => ({ ...o, groupCells: v }))}
                />
                <Check
                  label="Add a cell name label"
                  checked={opts.labelCells}
                  onChange={(v) => setOpts((o) => ({ ...o, labelCells: v }))}
                />
                <div className="mt-1 flex items-center gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <span className="text-muted">Columns</span>
                    <input
                      type="number"
                      min={0}
                      max={16}
                      value={opts.columns}
                      onChange={(e) =>
                        setOpts((o) => ({ ...o, columns: Math.max(0, Math.min(16, parseInt(e.target.value, 10) || 0)) }))
                      }
                      className="w-16 rounded border border-edge bg-panelalt px-2 py-1 text-right text-ink outline-none focus:border-accent"
                      title="0 = automatic"
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-muted">Spacing</span>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={opts.spacing}
                      onChange={(e) =>
                        setOpts((o) => ({ ...o, spacing: Math.max(0, parseInt(e.target.value, 10) || 0) }))
                      }
                      className="w-16 rounded border border-edge bg-panelalt px-2 py-1 text-right text-ink outline-none focus:border-accent"
                    />
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center gap-2 border-t border-edge px-4 py-3">
          <span className="text-[12px] text-muted">
            {parsed ? `${deviceCount} device${deviceCount === 1 ? '' : 's'} from ${chosen.length} cell${chosen.length === 1 ? '' : 's'}` : 'Nothing loaded yet'}
          </span>
          <button
            onClick={() => setDialog(null)}
            className="ml-auto rounded-lg border border-edge bg-panel px-3 py-1.5 text-sm text-ink hover:bg-panelalt"
          >
            Cancel
          </button>
          <button
            onClick={doImport}
            disabled={!deviceCount}
            className={
              'rounded-lg px-3 py-1.5 text-sm text-white shadow-soft transition-all active:scale-95 ' +
              (deviceCount ? 'bg-accent hover:brightness-110' : 'cursor-not-allowed bg-muted/40')
            }
          >
            Generate devices
          </button>
        </div>
      </div>
    </div>
  );
}
