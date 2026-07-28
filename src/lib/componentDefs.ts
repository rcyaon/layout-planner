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
 * Sizes are in world units (1 unit == 1px at 100% zoom); a device is snapped
 * to the grid on placement.
 */
export const DEVICE_DEFS: DeviceDef[] = [
  {
    kind: 'nmos',
    name: 'NMOS',
    category: 'Transistors',
    defaultWidth: 80,
    defaultHeight: 60,
    color: '#38bdf8',
    labelPrefix: 'MN',
    hint: 'N-channel MOSFET',
  },
  {
    kind: 'pmos',
    name: 'PMOS',
    category: 'Transistors',
    defaultWidth: 80,
    defaultHeight: 60,
    color: '#f472b6',
    labelPrefix: 'MP',
    hint: 'P-channel MOSFET',
  },
  {
    kind: 'resistor',
    name: 'Resistor',
    category: 'Passives',
    defaultWidth: 40,
    defaultHeight: 100,
    color: '#fbbf24',
    labelPrefix: 'R',
    hint: 'Resizable resistor',
  },
  {
    kind: 'capacitor',
    name: 'Capacitor',
    category: 'Passives',
    defaultWidth: 90,
    defaultHeight: 90,
    color: '#34d399',
    labelPrefix: 'C',
    hint: 'Resizable capacitor',
  },
  {
    kind: 'well',
    name: 'Well',
    category: 'Structures',
    defaultWidth: 200,
    defaultHeight: 160,
    color: '#64748b',
    labelPrefix: 'NW',
    hint: 'N-well / P-well region',
  },
  {
    kind: 'guardring',
    name: 'Guard Ring',
    category: 'Structures',
    defaultWidth: 220,
    defaultHeight: 180,
    color: '#22d3ee',
    labelPrefix: 'GR',
    hint: 'Substrate guard ring',
  },
  {
    kind: 'block',
    name: 'Block',
    category: 'Structures',
    defaultWidth: 180,
    defaultHeight: 120,
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
