# IC Layout Planner

A browser-based tool for **planning and communicating** analog / mixed-signal IC
floorplans before you open a full custom layout editor.

> These are **symbolic planning objects**, not process-accurate layout cells. The
> tool intentionally does **not** run DRC/LVS, simulate, or generate manufacturable
> layout — it helps you organize devices, routing, symmetry, matching and
> floorplanning first.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

Build for production:

```bash
npm run build    # type-checks then bundles to dist/
npm run preview  # serve the production build
```

## Feature overview

**Component library** (left) — NMOS, PMOS, resistor, capacitor, via, contact,
well, guard ring and generic block. Drag onto the canvas, or click to drop at the
viewport center. Every object is draggable, resizable, rotatable (90°), snaps to
grid, and exposes editable properties (label, size, orientation, notes, color).

**Netlist import** — load a SPICE / CDL netlist (`.sp`, `.cir`, `.net`, `.cdl`
— drop a file or paste it) and the planner generates the devices for you.
`M`, `R`, `C` and subcircuit-wrapped `X` instances become NMOS / PMOS /
resistors / capacitors; diodes, BJTs and inductors become blocks, as does any
instance of a `.subckt` defined in the deck. Each `.subckt` is offered as a
separate cell you can place independently, devices are optionally scaled by
their W/L (or R/C value) and grouped per cell, and every generated device keeps
its instance name, model, net connections and parameters — visible in the
properties panel.

**Infinite canvas** — pan (hold **Space** and drag), zoom (mouse wheel), a
configurable grid with snap-to-grid, optional rulers, and a live coordinate
readout in the status bar.

**Metal layers M1–M3** — each with its own color, visibility toggle and lock
toggle in the layer manager. The **Wire** tool routes on the active layer.

**Drawing tools** (top toolbar) — select, wire, rectangle, ellipse, line, arrow,
polyline, text/label/callout, and a measurement tool. Polyline and wire are
click-to-add-points; double-click or **Enter** to finish, **Esc** to cancel.

**Selection & editing** — single / shift-multi / box select, group & ungroup,
align (6 ways) and distribute, bring-to-front / send-to-back, lock, duplicate,
copy / paste, and arrow-key nudging.

**Project & export** — projects auto-save to your browser (localStorage).
Import / export the portable `*.iclp.json` project file, and export the layout as
**PNG**, **SVG** (true vector, whole design) or **PDF**.

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
