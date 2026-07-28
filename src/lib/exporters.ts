import { jsPDF } from 'jspdf';
import type Konva from 'konva';
import type { Element, Layer, ProjectFile } from '../types';
import { getBounds } from './geometry';
import { DEVICE_DEF_MAP } from './componentDefs';

// --- generic download helpers ----------------------------------------------

export function downloadURI(uri: string, name: string): void {
  const link = document.createElement('a');
  link.download = name;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadText(text: string, name: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  downloadURI(url, name);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- JSON ------------------------------------------------------------------

export function exportProjectJSON(project: ProjectFile): void {
  const safe = project.name.replace(/[^\w.-]+/g, '_') || 'project';
  downloadText(JSON.stringify(project, null, 2), `${safe}.iclp.json`);
}

// --- raster / vector from the live stage -----------------------------------

export function exportStagePNG(stage: Konva.Stage, name: string): void {
  const uri = stage.toDataURL({ pixelRatio: 2 });
  downloadURI(uri, `${name}.png`);
}

export function exportStagePDF(stage: Konva.Stage, name: string): void {
  const uri = stage.toDataURL({ pixelRatio: 2 });
  const w = stage.width();
  const h = stage.height();
  const orientation = w >= h ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'pt', format: [w, h] });
  pdf.addImage(uri, 'PNG', 0, 0, w, h);
  pdf.save(`${name}.pdf`);
}

// --- true vector SVG built from the data model -----------------------------

const PAD = 40;

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function rotateAttr(cx: number, cy: number, deg: number): string {
  return deg ? ` transform="rotate(${deg} ${cx} ${cy})"` : '';
}

function elementToSVG(el: Element, layers: Layer[]): string {
  const layerColor = (id: string | null) =>
    layers.find((l) => l.id === id)?.color ?? '#888';

  switch (el.type) {
    case 'device': {
      const def = DEVICE_DEF_MAP[el.kind];
      const name = def?.name ?? el.kind;
      const color = el.kind === 'block' && el.layer ? layerColor(el.layer) : el.color;
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const rot = rotateAttr(cx, cy, el.rotation);
      return `<g${rot}>
  <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="4"
        fill="${color}22" stroke="${color}" stroke-width="1.5"/>
  <text x="${cx}" y="${cy}" fill="${color}" font-size="13" font-family="sans-serif"
        text-anchor="middle" dominant-baseline="middle">${esc(name)}</text>
  ${el.label ? `<text x="${el.x + 4}" y="${el.y - 5}" fill="#cbd5e1" font-size="12" font-family="sans-serif">${esc(el.label)}</text>` : ''}
</g>`;
    }
    case 'shape': {
      const stroke = el.layer ? layerColor(el.layer) : el.stroke;
      if (el.shape === 'rect') {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        return `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}"
          fill="${el.fill}" stroke="${stroke}" stroke-width="${el.strokeWidth}"${rotateAttr(cx, cy, el.rotation)}/>`;
      }
      if (el.shape === 'circle') {
        const rx = el.width / 2;
        const ry = el.height / 2;
        return `<ellipse cx="${el.x + rx}" cy="${el.y + ry}" rx="${rx}" ry="${ry}"
          fill="${el.fill}" stroke="${stroke}" stroke-width="${el.strokeWidth}"/>`;
      }
      // line / arrow / polyline
      const pts = absPoints(el.x, el.y, el.points);
      const marker = el.shape === 'arrow' ? ' marker-end="url(#arrow)"' : '';
      return `<polyline points="${pts}" fill="none" stroke="${stroke}" stroke-width="${el.strokeWidth}"${marker}/>`;
    }
    case 'wire': {
      const pts = absPoints(el.x, el.y, el.points);
      const stroke = layerColor(el.layer);
      const mid = el.points.length >= 4;
      const label = el.label && mid
        ? `<text x="${el.x + el.points[0] + 4}" y="${el.y + el.points[1] - 4}" fill="${stroke}" font-size="11" font-family="sans-serif">${esc(el.label)}</text>`
        : '';
      return `<polyline points="${pts}" fill="none" stroke="${stroke}" stroke-width="${el.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>${label}`;
    }
    case 'text': {
      const box = el.callout
        ? `<rect x="${el.x - 6}" y="${el.y - 6}" width="${el.width + 12}" height="${el.fontSize * 1.6 + 12}" rx="6" fill="#0008" stroke="${el.color}" stroke-width="1"/>`
        : '';
      return `${box}<text x="${el.x}" y="${el.y + el.fontSize}" fill="${el.color}" font-size="${el.fontSize}" font-family="sans-serif">${esc(el.text)}</text>`;
    }
    case 'measure': {
      const [x1, y1, x2, y2] = el.points;
      const ax = el.x + x1;
      const ay = el.y + y1;
      const bx = el.x + x2;
      const by = el.y + y2;
      const d = Math.hypot(x2 - x1, y2 - y1).toFixed(1);
      return `<g stroke="#fbbf24" fill="#fbbf24" font-family="sans-serif">
  <line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke-width="1"/>
  <circle cx="${ax}" cy="${ay}" r="3"/><circle cx="${bx}" cy="${by}" r="3"/>
  <text x="${(ax + bx) / 2}" y="${(ay + by) / 2 - 6}" font-size="12" text-anchor="middle" stroke="none">${d}</text>
</g>`;
    }
  }
}

function absPoints(ox: number, oy: number, points: number[]): string {
  const out: string[] = [];
  for (let i = 0; i < points.length; i += 2) {
    out.push(`${ox + points[i]},${oy + points[i + 1]}`);
  }
  return out.join(' ');
}

export function buildSVG(elements: Element[], layers: Layer[]): string {
  if (!elements.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"></svg>`;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    const b = getBounds(el);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  const w = maxX - minX + PAD * 2;
  const h = maxY - minY + PAD * 2;
  const visibleLayers = new Set(layers.filter((l) => l.visible).map((l) => l.id));
  const body = elements
    .filter((el) => {
      if (el.type === 'wire') return visibleLayers.has(el.layer);
      if (el.type === 'shape' && el.layer) return visibleLayers.has(el.layer);
      if (el.type === 'device' && el.kind === 'block' && el.layer) return visibleLayers.has(el.layer);
      return true;
    })
    .map((el) => elementToSVG(el, layers))
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/>
  </marker>
</defs>
<rect x="0" y="0" width="${w}" height="${h}" fill="#17171b"/>
<g transform="translate(${PAD - minX}, ${PAD - minY})">
${body}
</g>
</svg>`;
}

export function exportSVG(elements: Element[], layers: Layer[], name: string): void {
  downloadText(buildSVG(elements, layers), `${name}.svg`, 'image/svg+xml');
}
