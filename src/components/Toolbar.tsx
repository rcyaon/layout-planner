import { useRef, useState } from 'react';
import {
  MousePointer2,
  Spline,
  Square,
  Circle,
  Minus,
  MoveUpRight,
  Waypoints,
  Type,
  Ruler,
  Undo2,
  Redo2,
  Copy,
  Trash2,
  Group as GroupIcon,
  Ungroup,
  Lock,
  RotateCw,
  RotateCcw,
  BringToFront,
  SendToBack,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  FilePlus2,
  FolderOpen,
  Download,
  ChevronDown,
  CircuitBoard,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Tool } from '../types';
import { stageHolder } from '../canvas/stageHolder';
import { exportProjectJSON, exportSVG, exportStagePNG, exportStagePDF } from '../lib/exporters';

const TOOLS: { tool: Tool; icon: LucideIcon; label: string; key: string }[] = [
  { tool: 'select', icon: MousePointer2, label: 'Select', key: 'V' },
  { tool: 'wire', icon: Spline, label: 'Wire (routing)', key: 'W' },
  { tool: 'rect', icon: Square, label: 'Rectangle', key: 'R' },
  { tool: 'circle', icon: Circle, label: 'Ellipse', key: 'O' },
  { tool: 'line', icon: Minus, label: 'Line', key: 'L' },
  { tool: 'arrow', icon: MoveUpRight, label: 'Arrow', key: 'A' },
  { tool: 'polyline', icon: Waypoints, label: 'Polyline', key: 'P' },
  { tool: 'text', icon: Type, label: 'Text / Label', key: 'T' },
  { tool: 'measure', icon: Ruler, label: 'Measure', key: 'M' },
];

function IconBtn({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={
        'flex h-8 w-8 items-center justify-center rounded-lg transition-all active:scale-90 ' +
        (active
          ? 'bg-accent text-white shadow-soft'
          : disabled
            ? 'text-muted/40'
            : 'text-ink hover:bg-panelalt')
      }
    >
      <Icon size={16} />
    </button>
  );
}

const Divider = () => <div className="mx-1 h-6 w-px bg-edge" />;

export default function Toolbar() {
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const selCount = useStore((s) => s.selectedIds.length);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const [exportOpen, setExportOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const toggleExport = () => {
    if (!exportOpen) {
      const r = exportBtnRef.current?.getBoundingClientRect();
      if (r) setMenuPos({ top: r.bottom + 6, left: r.left });
    }
    setExportOpen((v) => !v);
  };

  const s = () => useStore.getState();

  const rotate = (dir: 1 | -1) => {
    const st = s();
    st.pushHistory();
    for (const id of st.selectedIds) {
      const el = st.elements.find((e) => e.id === id);
      if (el && !el.locked) st.updateElement(id, { rotation: (((el.rotation + dir * 90) % 360) + 360) % 360 });
    }
  };

  const doExport = (kind: 'png' | 'svg' | 'pdf' | 'json') => {
    setExportOpen(false);
    const st = s();
    const name = st.projectName.replace(/[^\w.-]+/g, '_') || 'layout';
    if (kind === 'json') exportProjectJSON(st.toProjectFile());
    else if (kind === 'svg') exportSVG(st.elements, st.layers, name);
    else if (stageHolder.stage) {
      if (kind === 'png') exportStagePNG(stageHolder.stage, name);
      else exportStagePDF(stageHolder.stage, name);
    }
  };

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        s().loadProject(data);
      } catch {
        // ignore malformed files
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const hasSel = selCount > 0;
  const multi = selCount > 1;

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-edge bg-panel px-2 py-1.5 shadow-soft scroll-thin">
      {/* file */}
      <IconBtn icon={FilePlus2} label="New project" onClick={() => s().newProject()} />
      <IconBtn icon={FolderOpen} label="Import JSON…" onClick={() => fileInput.current?.click()} />
      <input ref={fileInput} type="file" accept=".json,application/json" className="hidden" onChange={onImport} />
      <button
        onClick={() => s().setDialog('netlist')}
        className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm text-ink hover:bg-panelalt"
        title="Import netlist — generate devices from a SPICE netlist"
      >
        <CircuitBoard size={16} />
        <span className="hidden whitespace-nowrap text-[13px] font-medium lg:inline">Import netlist</span>
      </button>
      <button
        ref={exportBtnRef}
        onClick={toggleExport}
        className="flex h-8 items-center gap-1 rounded-lg px-2 text-sm text-ink hover:bg-panelalt"
        title="Export"
      >
        <Download size={16} />
        <ChevronDown size={13} />
      </button>
      {exportOpen && menuPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
          <div
            className="fixed z-50 w-40 rounded-xl border border-edge bg-panel py-1.5 text-sm shadow-pop"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {(['png', 'svg', 'pdf', 'json'] as const).map((k) => (
              <button
                key={k}
                onClick={() => doExport(k)}
                className="block w-full px-3 py-1.5 text-left text-ink hover:bg-panelalt"
              >
                Export {k.toUpperCase()}
              </button>
            ))}
          </div>
        </>
      )}
      <Divider />
      <IconBtn icon={Undo2} label="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => s().undo()} />
      <IconBtn icon={Redo2} label="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={() => s().redo()} />
      <Divider />

      {/* tools */}
      {TOOLS.map((t) => (
        <IconBtn
          key={t.tool}
          icon={t.icon}
          label={`${t.label} (${t.key})`}
          active={tool === t.tool}
          onClick={() => setTool(t.tool)}
        />
      ))}
      <Divider />

      {/* edit */}
      <IconBtn icon={RotateCcw} label="Rotate -90°" disabled={!hasSel} onClick={() => rotate(-1)} />
      <IconBtn icon={RotateCw} label="Rotate +90°" disabled={!hasSel} onClick={() => rotate(1)} />
      <IconBtn icon={Copy} label="Duplicate (Ctrl+D)" disabled={!hasSel} onClick={() => s().duplicateSelected()} />
      <IconBtn icon={Trash2} label="Delete (Del)" disabled={!hasSel} onClick={() => s().removeSelected()} />
      <IconBtn icon={GroupIcon} label="Group (Ctrl+G)" disabled={!multi} onClick={() => s().group()} />
      <IconBtn icon={Ungroup} label="Ungroup" disabled={!hasSel} onClick={() => s().ungroup()} />
      <IconBtn icon={Lock} label="Lock / Unlock (Ctrl+L)" disabled={!hasSel} onClick={() => s().toggleLockSelected()} />
      <Divider />

      {/* order */}
      <IconBtn icon={BringToFront} label="Bring to front" disabled={!hasSel} onClick={() => s().order('front')} />
      <IconBtn icon={SendToBack} label="Send to back" disabled={!hasSel} onClick={() => s().order('back')} />
      <Divider />

      {/* align */}
      <IconBtn icon={AlignStartVertical} label="Align left" disabled={!multi} onClick={() => s().align('left')} />
      <IconBtn icon={AlignCenterVertical} label="Align center X" disabled={!multi} onClick={() => s().align('centerX')} />
      <IconBtn icon={AlignEndVertical} label="Align right" disabled={!multi} onClick={() => s().align('right')} />
      <IconBtn icon={AlignStartHorizontal} label="Align top" disabled={!multi} onClick={() => s().align('top')} />
      <IconBtn icon={AlignCenterHorizontal} label="Align middle Y" disabled={!multi} onClick={() => s().align('centerY')} />
      <IconBtn icon={AlignEndHorizontal} label="Align bottom" disabled={!multi} onClick={() => s().align('bottom')} />
      <IconBtn
        icon={AlignHorizontalSpaceAround}
        label="Distribute horizontally"
        disabled={selCount < 3}
        onClick={() => s().distribute('h')}
      />
      <IconBtn
        icon={AlignVerticalSpaceAround}
        label="Distribute vertically"
        disabled={selCount < 3}
        onClick={() => s().distribute('v')}
      />
    </div>
  );
}
