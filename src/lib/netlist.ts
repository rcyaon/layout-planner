// ---------------------------------------------------------------------------
// SPICE netlist parser.
//
// Reads the common flavours of SPICE / CDL decks (HSPICE, Spectre-netlist,
// ngspice, sky130 / gf180 style subckt-wrapped devices) and turns them into a
// list of planning devices per cell. It is deliberately forgiving: anything it
// cannot interpret becomes a warning, never a hard failure.
// ---------------------------------------------------------------------------

import type { DeviceKind } from '../types';

export interface NetlistDevice {
  /** Instance name from the deck, e.g. `M1`, `XM3`, `Rload`. */
  name: string;
  kind: DeviceKind;
  /** Model / subcircuit name (empty when the deck omits it). */
  model: string;
  /** Connected nets, in deck order. */
  nets: string[];
  /** Terminal names matching `nets` (`D G S B`, `A B`, …). */
  terminals: string[];
  /** Instance parameters, keys lower-cased (`w`, `l`, `m`, `nf`, …). */
  params: Record<string, string>;
  /** Scalar value for passives written positionally (`R1 a b 10k`). */
  value: number | null;
  /** Set when the instance refers to a `.subckt` defined in the deck. */
  subcktRef?: string;
  line: number;
}

export interface NetlistCell {
  name: string;
  /** True for the implicit cell holding top-level (non-`.subckt`) devices. */
  isTop: boolean;
  ports: string[];
  devices: NetlistDevice[];
}

export interface ParsedNetlist {
  title: string;
  cells: NetlistCell[];
  warnings: string[];
  deviceCount: number;
}

// --- value parsing ----------------------------------------------------------

/** SPICE engineering suffixes. Longest-first so `meg`/`mil` beat `m`. */
const SUFFIXES: [string, number][] = [
  ['meg', 1e6],
  ['mil', 25.4e-6],
  ['t', 1e12],
  ['g', 1e9],
  ['k', 1e3],
  ['m', 1e-3],
  ['u', 1e-6],
  ['µ', 1e-6],
  ['n', 1e-9],
  ['p', 1e-12],
  ['f', 1e-15],
  ['a', 1e-18],
];

/** `"4.7k"` → 4700, `"1u"` → 1e-6, `"2.2pF"` → 2.2e-12. Null if not a number. */
export function parseValue(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  const s = raw.trim().toLowerCase().replace(/^['"{]|['"}]$/g, '');
  const m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([a-zµ]*)$/.exec(s);
  if (!m) return null;
  let v = parseFloat(m[1]);
  if (m[2]) {
    const hit = SUFFIXES.find(([k]) => m[2].startsWith(k));
    if (hit) v *= hit[1];
  }
  return Number.isFinite(v) ? v : null;
}

/**
 * Geometry in a deck is either SI (`W=2u`) or already in microns (`W=2`, the
 * usual convention for PDK subckt devices). Anything below 1 mm is treated as
 * metres and converted; anything larger is assumed to be microns already.
 */
export function toMicrons(v: number | null): number | null {
  if (v == null || v <= 0) return null;
  return v < 1e-3 ? v * 1e6 : v;
}

/** Human-friendly value with an engineering suffix, for labels and notes. */
export function formatValue(v: number, unit = ''): string {
  const units: [number, string][] = [
    [1e12, 'T'],
    [1e9, 'G'],
    [1e6, 'M'],
    [1e3, 'k'],
    [1, ''],
    [1e-3, 'm'],
    [1e-6, 'µ'],
    [1e-9, 'n'],
    [1e-12, 'p'],
    [1e-15, 'f'],
  ];
  const a = Math.abs(v);
  for (const [mag, suffix] of units) {
    if (a >= mag) {
      const n = v / mag;
      return `${Math.round(n * 1000) / 1000}${suffix}${unit}`;
    }
  }
  return `${v}${unit}`;
}

// --- model classification ---------------------------------------------------

const P_MOS = /(^|[^a-z])p(mos|ch|fet|jf)|pmos|pfet|pch|_p_/;
const N_MOS = /(^|[^a-z])n(mos|ch|fet|jf)|nmos|nfet|nch|_n_/;
const RES = /(^|[^a-z])(res|rpoly|rhigh|rnpoly|rppoly|xres)|_r_|resistor/;
const CAP = /(^|[^a-z])(cap|mim|mom|vpp|xcap)|_c_|capacitor/;

/** NMOS / PMOS from a model name, or null when it is not a MOSFET model. */
export function mosTypeOf(model: string): 'nmos' | 'pmos' | null {
  const m = model.toLowerCase();
  if (P_MOS.test(m)) return 'pmos';
  if (N_MOS.test(m)) return 'nmos';
  return null;
}

function terminalsFor(kind: DeviceKind, count: number): string[] {
  if (kind === 'nmos' || kind === 'pmos') {
    return ['D', 'G', 'S', 'B'].slice(0, count);
  }
  if (kind === 'resistor' || kind === 'capacitor') {
    return ['A', 'B'].slice(0, count);
  }
  return Array.from({ length: count }, (_, i) => `p${i + 1}`);
}

// --- line preprocessing -----------------------------------------------------

/** Drop trailing `$`, `;` and `//` comments without touching quoted text. */
function stripInlineComment(s: string): string {
  const cut = [s.indexOf(' $'), s.indexOf(';'), s.indexOf('//')].filter((i) => i >= 0);
  return cut.length ? s.slice(0, Math.min(...cut)).trim() : s;
}

interface LogicalLine {
  text: string;
  line: number;
}

/** Strip comments, join `+` continuations, keep original line numbers. */
function toLogicalLines(text: string): { lines: LogicalLine[]; starLines: string[] } {
  const lines: LogicalLine[] = [];
  const starLines: string[] = [];
  const raw = text.replace(/\r\n?/g, '\n').split('\n');

  raw.forEach((original, i) => {
    let s = original.trim();
    if (!s) return;
    if (s.startsWith('*')) {
      starLines.push(s.replace(/^\*+\s*/, ''));
      return;
    }
    s = stripInlineComment(s);
    if (!s) return;
    if (s.startsWith('+')) {
      const cont = s.slice(1).trim();
      if (lines.length) {
        lines[lines.length - 1].text += ' ' + cont;
        return;
      }
      s = cont;
    }
    lines.push({ text: s, line: i + 1 });
  });

  return { lines, starLines };
}

/** Split a statement into positional tokens and `key=value` parameters. */
function tokenize(text: string): { head: string; pos: string[]; params: Record<string, string> } {
  const toks = text
    .replace(/\s*=\s*/g, '=')
    .split(/[\s,()]+/)
    .filter(Boolean);
  const params: Record<string, string> = {};
  const pos: string[] = [];
  for (const t of toks.slice(1)) {
    const eq = t.indexOf('=');
    if (eq > 0) params[t.slice(0, eq).toLowerCase()] = t.slice(eq + 1);
    else pos.push(t);
  }
  return { head: toks[0] ?? '', pos, params };
}

// --- parser -----------------------------------------------------------------

/** Element prefixes that are stimulus / analysis, not layout objects. */
const IGNORED_PREFIXES = new Set(['v', 'i', 'e', 'f', 'g', 'h', 'k', 's', 'w', 'b']);
/** Elements that occupy area but have no dedicated symbol — drawn as blocks. */
const BLOCK_PREFIXES = new Set(['d', 'q', 'j', 'z', 'l']);

export function parseNetlist(text: string): ParsedNetlist {
  const { lines, starLines } = toLogicalLines(text);
  const warnings: string[] = [];

  // Pre-scan so an X instance of a locally defined cell is never mistaken for
  // a PDK device model.
  const subcktNames = new Set<string>();
  for (const { text: t } of lines) {
    const m = /^\.subckt\s+(\S+)/i.exec(t);
    if (m) subcktNames.add(m[1].toLowerCase());
  }

  const top: NetlistCell = { name: 'Top level', isTop: true, ports: [], devices: [] };
  const cells: NetlistCell[] = [top];
  const stack: NetlistCell[] = [top];
  const cur = () => stack[stack.length - 1];

  let title = starLines[0] ?? '';
  const firstLine = lines[0]?.line;

  for (const { text: stmt, line } of lines) {
    const lower = stmt.toLowerCase();

    // --- dot cards ---------------------------------------------------------
    if (stmt.startsWith('.')) {
      if (lower.startsWith('.subckt')) {
        const toks = stmt.split(/[\s,()]+/).filter(Boolean);
        const name = toks[1] ?? `cell${cells.length}`;
        const cell: NetlistCell = {
          name,
          isTop: false,
          ports: toks.slice(2).filter((t) => !t.includes('=')),
          devices: [],
        };
        cells.push(cell);
        stack.push(cell);
      } else if (lower.startsWith('.ends') || lower.startsWith('.eom')) {
        if (stack.length > 1) stack.pop();
      }
      // every other dot card (.model, .param, .include, .tran, …) is metadata
      continue;
    }

    const prefix = lower[0];
    if (IGNORED_PREFIXES.has(prefix)) continue;

    const { head, pos, params } = tokenize(stmt);
    const model = pos.length > 1 ? pos[pos.length - 1] : '';
    const netsFromPos = pos.length > 1 ? pos.slice(0, -1) : pos;

    const push = (kind: DeviceKind, nets: string[], extra: Partial<NetlistDevice> = {}) => {
      cur().devices.push({
        name: head,
        kind,
        model,
        nets,
        terminals: terminalsFor(kind, nets.length),
        params,
        value: null,
        line,
        ...extra,
      });
    };

    if (prefix === 'm') {
      if (netsFromPos.length < 3) {
        warnings.push(`Line ${line}: "${head}" needs at least 3 nodes — skipped.`);
        continue;
      }
      const t = mosTypeOf(model);
      if (!t) warnings.push(`Line ${line}: model "${model}" is not recognisable — placed as NMOS.`);
      push(t ?? 'nmos', netsFromPos);
      continue;
    }

    if (prefix === 'r' || prefix === 'c') {
      const kind: DeviceKind = prefix === 'r' ? 'resistor' : 'capacitor';
      const nets = pos.slice(0, 2);
      if (nets.length < 2) {
        warnings.push(`Line ${line}: "${head}" needs 2 nodes — skipped.`);
        continue;
      }
      // third positional token is either the value or a model name
      const third = pos[2];
      const positional = parseValue(third);
      const keyed = parseValue(params[prefix] ?? params.value ?? params.val);
      push(kind, nets, {
        model: positional == null ? third ?? '' : '',
        value: keyed ?? positional,
      });
      continue;
    }

    if (prefix === 'x') {
      const isLocalCell = subcktNames.has(model.toLowerCase());
      const t = isLocalCell ? null : mosTypeOf(model);
      if (t) {
        push(t, netsFromPos);
      } else if (!isLocalCell && RES.test(model.toLowerCase())) {
        push('resistor', pos.slice(0, 2), { value: parseValue(params.r ?? params.value) });
      } else if (!isLocalCell && CAP.test(model.toLowerCase())) {
        push('capacitor', pos.slice(0, 2), { value: parseValue(params.c ?? params.value) });
      } else {
        push('block', netsFromPos, { subcktRef: model });
      }
      continue;
    }

    if (BLOCK_PREFIXES.has(prefix)) {
      // an inductor writes its value where other elements write a model name
      const v = parseValue(model);
      push('block', netsFromPos, v == null ? {} : { model: '', value: v });
      continue;
    }

    // Unrecognised. The very first statement of a deck is its title line.
    if (line === firstLine && !title) title = stmt;
    else warnings.push(`Line ${line}: unrecognised statement "${stmt.slice(0, 40)}" — skipped.`);
  }

  if (stack.length > 1) warnings.push('A `.subckt` was never closed with `.ends`.');

  const deviceCount = cells.reduce((n, c) => n + c.devices.length, 0);
  if (!deviceCount) warnings.push('No devices found — is this a SPICE netlist?');

  return {
    title: title.trim(),
    cells: cells.filter((c) => c.devices.length > 0),
    warnings,
    deviceCount,
  };
}

/** One-line summary of a cell's contents, e.g. `4 NMOS · 2 PMOS · 1 R`. */
export function summarizeCell(cell: NetlistCell): string {
  const names: Record<DeviceKind, string> = {
    nmos: 'NMOS',
    pmos: 'PMOS',
    resistor: 'R',
    capacitor: 'C',
    well: 'well',
    guardring: 'guard ring',
    block: 'block',
  };
  const counts = new Map<DeviceKind, number>();
  for (const d of cell.devices) counts.set(d.kind, (counts.get(d.kind) ?? 0) + 1);
  if (!counts.size) return 'empty';
  return [...counts.entries()].map(([k, n]) => `${n} ${names[k]}`).join(' · ');
}
