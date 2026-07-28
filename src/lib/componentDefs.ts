import type { DeviceKind } from '../types';

export interface DeviceDef {
  kind: DeviceKind;
  name: string;
  category: 'Transistors' | 'Passives' | 'Structures';
  defaultWidth: number;
  defaultHeight: number;
  color: string;
  labelPrefix: string;
  hint: string;
}

/**
 * Catalog of symbolic planning devices shown in the component library.
 * Sizes are in nanometres and are symbolic rather than process-accurate — they
 * sit in the few-µm range so a handful of devices reads well next to a die of a
 * few hundred µm. A device is snapped to the grid on placement.
 */
export const DEVICE_DEFS: DeviceDef[] = [
  {
    kind: 'nmos',
    name: 'NMOS',
    category: 'Transistors',
    defaultWidth: 2000,
    defaultHeight: 1500,
    color: '#38bdf8',
    labelPrefix: 'MN',
    hint: 'N-channel MOSFET',
  },
  {
    kind: 'pmos',
    name: 'PMOS',
    category: 'Transistors',
    defaultWidth: 2000,
    defaultHeight: 1500,
    color: '#f472b6',
    labelPrefix: 'MP',
    hint: 'P-channel MOSFET',
  },
  {
    kind: 'resistor',
    name: 'Resistor',
    category: 'Passives',
    defaultWidth: 1000,
    defaultHeight: 2500,
    color: '#fbbf24',
    labelPrefix: 'R',
    hint: 'Resizable resistor',
  },
  {
    kind: 'capacitor',
    name: 'Capacitor',
    category: 'Passives',
    defaultWidth: 2000,
    defaultHeight: 2000,
    color: '#34d399',
    labelPrefix: 'C',
    hint: 'Resizable capacitor',
  },
  {
    kind: 'well',
    name: 'Well',
    category: 'Structures',
    defaultWidth: 5000,
    defaultHeight: 4000,
    color: '#64748b',
    labelPrefix: 'NW',
    hint: 'N-well / P-well region',
  },
  {
    kind: 'guardring',
    name: 'Guard Ring',
    category: 'Structures',
    defaultWidth: 5500,
    defaultHeight: 4500,
    color: '#22d3ee',
    labelPrefix: 'GR',
    hint: 'Substrate guard ring',
  },
  {
    kind: 'block',
    name: 'Block',
    category: 'Structures',
    defaultWidth: 4500,
    defaultHeight: 3000,
    color: '#e2e8f0',
    labelPrefix: 'BLK',
    hint: 'Generic layout block',
  },
];

export const DEVICE_DEF_MAP: Record<DeviceKind, DeviceDef> = DEVICE_DEFS.reduce(
  (acc, d) => {
    acc[d.kind] = d;
    return acc;
  },
  {} as Record<DeviceKind, DeviceDef>,
);

export const DEVICE_CATEGORIES = ['Transistors', 'Passives', 'Structures'] as const;
