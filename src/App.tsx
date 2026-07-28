import { useEffect } from 'react';
import CanvasStage from './canvas/CanvasStage';
import Toolbar from './components/Toolbar';
import ComponentLibrary from './components/ComponentLibrary';
import LayerPanel from './components/LayerPanel';
import StatusBar from './components/StatusBar';
import Doodles from './components/Doodles';
import ProjectNameField from './components/ProjectNameField';
import NetlistDialog from './components/NetlistDialog';
import { useStore } from './store/useStore';
import type { Tool } from './types';

const AUTOSAVE_KEY = 'iclp:autosave';

const TOOL_KEYS: Record<string, Tool> = {
  v: 'select',
  w: 'wire',
  r: 'rect',
  o: 'circle',
  l: 'line',
  a: 'arrow',
  p: 'polyline',
  t: 'text',
  m: 'measure',
};

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

export default function App() {
  // --- keyboard shortcuts ---------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const st = useStore.getState();
      if (st.dialog) return; // a modal owns the keyboard
      const mod = e.metaKey || e.ctrlKey;

      if (mod) {
        const k = e.key.toLowerCase();
        if (k === 'z') {
          e.preventDefault();
          e.shiftKey ? st.redo() : st.undo();
          return;
        }
        if (k === 'y') {
          e.preventDefault();
          st.redo();
          return;
        }
        if (k === 'c') {
          st.copy();
          return;
        }
        if (k === 'v') {
          st.paste();
          return;
        }
        if (k === 'd') {
          e.preventDefault();
          st.duplicateSelected();
          return;
        }
        if (k === 'a') {
          e.preventDefault();
          st.selectAll();
          return;
        }
        if (k === 'g') {
          e.preventDefault();
          e.shiftKey ? st.ungroup() : st.group();
          return;
        }
        if (k === 'l') {
          e.preventDefault();
          st.toggleLockSelected();
          return;
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        st.removeSelected();
        return;
      }

      if (e.key.startsWith('Arrow') && st.selectedIds.length) {
        e.preventDefault();
        const d = st.grid.snap ? st.grid.size : 1;
        const step = e.shiftKey ? d * 5 : d;
        if (e.key === 'ArrowLeft') st.moveSelectedBy(-step, 0);
        else if (e.key === 'ArrowRight') st.moveSelectedBy(step, 0);
        else if (e.key === 'ArrowUp') st.moveSelectedBy(0, -step);
        else if (e.key === 'ArrowDown') st.moveSelectedBy(0, step);
        return;
      }

      const tool = TOOL_KEYS[e.key.toLowerCase()];
      if (tool) st.setTool(tool);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // --- load + autosave ------------------------------------------------------
  useEffect(() => {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (raw) {
      try {
        useStore.getState().loadProject(JSON.parse(raw));
      } catch {
        /* ignore corrupt autosave */
      }
    }
    let timer: number | undefined;
    const unsub = useStore.subscribe((state, prev) => {
      if (
        state.elements === prev.elements &&
        state.layers === prev.layers &&
        state.grid === prev.grid &&
        state.projectName === prev.projectName
      ) {
        return;
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        try {
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(useStore.getState().toProjectFile()));
        } catch {
          /* storage may be full or unavailable */
        }
      }, 700);
    });
    return () => {
      window.clearTimeout(timer);
      unsub();
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-appbg text-ink">
      <Doodles />
      <div className="absolute inset-5 z-10 flex flex-col overflow-hidden rounded-2xl border border-edge bg-panel shadow-pop">
      <header className="flex items-center gap-2.5 border-b border-edge bg-panel px-4 py-2 shadow-soft">
        <span className="relative mr-1 text-[15px] font-display font-bold tracking-tight text-ink">
          Layout Planner
          <svg className="pointer-events-none absolute -bottom-1.5 left-0 w-full" height="5" viewBox="0 0 120 5" preserveAspectRatio="none">
            <path d="M1 3 C 20 0, 42 5, 62 2.5 S 100 1, 119 3" stroke="#d99b3c" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </svg>
        </span>
        <ProjectNameField />
      </header>

      <Toolbar />

      <div className="flex min-h-0 flex-1">
        {/* Left rail: component library on top, metal layers pinned below it. */}
        <div className="flex w-60 shrink-0 flex-col border-r border-edge bg-panel">
          <ComponentLibrary />
          <LayerPanel />
        </div>
        <div className="min-w-0 flex-1 p-2">
          <CanvasStage />
        </div>
      </div>

      <StatusBar />
      </div>
      <NetlistDialog />
    </div>
  );
}
