# IC Layout Planner

A browser-based tool for **planning and communicating** analog / mixed-signal IC
floorplans before you open a full custom layout editor.

> These are **symbolic planning objects**, not process-accurate layout cells. The tool intentionally does **not** run DRC/LVS, simulate, or generate manufacturable layout. It simply helps you organize devices, routing, symmetry, matching and floor planning first.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

## Keyboard shortcuts

| Action | Keys |
| --- | --- |
| Tools | V select · W wire · R rect · O ellipse · L line · A arrow · P polyline · T text · M measure |
| Undo / Redo | Ctrl/Cmd+Z · Ctrl/Cmd+Shift+Z (or Ctrl+Y) |
| Copy / Paste / Duplicate | Ctrl/Cmd+C · V · D |
| Select all | Ctrl/Cmd+A |
| Group / Ungroup | Ctrl/Cmd+G · Ctrl/Cmd+Shift+G |
| Lock / Unlock | Ctrl/Cmd+L |
| Delete | Delete / Backspace |
| Nudge | Arrow keys (Shift = ×5) |
| Pan | Hold Space + drag |
| Finish polyline/wire | Enter · Cancel: Esc |

## Architecture

```
src/
  types.ts                 # data model (Element union, layers, project file)
  store/useStore.ts        # Zustand store: elements, selection, layers,
                           #   history (undo/redo), clipboard, align/distribute
  lib/
    componentDefs.ts       # symbolic device catalog
    geometry.ts            # snap, bounds, intersection, ids
    exporters.ts           # PNG / PDF (Konva) · SVG (model) · JSON
    netlist.ts             # SPICE/CDL parser → cells + devices
    netlistImport.ts       # parsed netlist → sized, placed elements
  canvas/
    CanvasStage.tsx        # Konva stage: pan/zoom/grid/snap, drawing,
                           #   box-select, group-move, transformer
    ElementNode.tsx        # renders one element (device/shape/wire/text/measure)
    DeviceSymbol.tsx       # per-device symbolic glyphs
    Rulers.tsx             # screen-space rulers
  components/
    Toolbar.tsx            # tools + edit actions + file/export
    ComponentLibrary.tsx   # draggable device palette
    PropertiesPanel.tsx    # context-sensitive property editor
    LayerPanel.tsx         # metal-layer manager
    NetlistDialog.tsx      # netlist import modal (source, cells, options)
    StatusBar.tsx          # zoom / coords / counts
  App.tsx                  # layout, shortcuts, autosave
```

Rendering (Konva), state (Zustand) and UI (React components) are kept separate so
the tool is easy to extend with PDK-specific components and advanced analog
planning features.

### Extending

- **New device:** add an entry to `DEVICE_DEFS` in `lib/componentDefs.ts` and a
  glyph branch in `canvas/DeviceSymbol.tsx`.
- **New layer:** extend `DEFAULT_LAYERS` and the `LayerId` union in `types.ts`.
- **New tool / element type:** add to the `Tool` union and the `Element` union,
  then handle it in `CanvasStage` (interaction) and `ElementNode` (rendering).
- **New netlist element:** map its SPICE prefix to a `DeviceKind` in
  `lib/netlist.ts`, and give it a size rule in `deviceSize()` in
  `lib/netlistImport.ts`.
