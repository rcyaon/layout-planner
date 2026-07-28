import type { DragEvent } from 'react';
import { DEVICE_DEFS } from '../lib/componentDefs';
import { useStore } from '../store/useStore';
import DeviceThumb from './DeviceThumb';

export default function ComponentLibrary() {
  const addDeviceCenter = useStore((s) => s.addDeviceCenter);

  const onDragStart = (e: DragEvent, kind: string) => {
    e.dataTransfer.setData('application/x-iclp-device', kind);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    // Width, border and background belong to the left rail in App; this just
    // takes the space the layer panel below it doesn't need.
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pb-2 pt-3 text-sm font-bold text-ink">Components</div>
      <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-3">
        <div className="grid grid-cols-2 gap-1">
          {DEVICE_DEFS.map((def) => (
            <button
              key={def.kind}
              draggable
              onDragStart={(e) => onDragStart(e, def.kind)}
              onClick={() => addDeviceCenter(def.kind)}
              title={`${def.hint} — drag to canvas or click to place`}
              className="flex cursor-grab flex-col items-center gap-1.5 rounded-xl border border-transparent p-2 transition-all hover:border-edge hover:bg-panelalt hover:shadow-soft active:scale-95 active:cursor-grabbing"
            >
              <DeviceThumb kind={def.kind} />
              <span className="text-center text-[11px] font-semibold leading-tight text-ink">{def.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
