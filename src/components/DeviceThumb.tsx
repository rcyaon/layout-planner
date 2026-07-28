import type { DeviceKind } from '../types';
import { PLAYER } from '../lib/processLayers';

const W = 40;
const H = 30;

function Cut({ x, y, s = 4 }: { x: number; y: number; s?: number }) {
  return <rect x={x - s / 2} y={y - s / 2} width={s} height={s} rx={0.8} fill={PLAYER.contact} stroke="#5b5f70" strokeWidth={0.5} />;
}

/** Mini SVG preview of a device's layout look, for the component library. */
export default function DeviceThumb({ kind }: { kind: DeviceKind }) {
  let body: React.ReactNode = null;
  switch (kind) {
    case 'nmos':
    case 'pmos':
      body = (
        <>
          {kind === 'pmos' && <rect x={2} y={2} width={36} height={26} rx={3} fill={PLAYER.nwell + '30'} stroke={PLAYER.nwell} strokeDasharray="3 2" />}
          <rect x={7} y={6} width={26} height={18} rx={2} fill={(kind === 'nmos' ? PLAYER.nactive : PLAYER.pactive) + '40'} stroke={kind === 'nmos' ? PLAYER.nactive : PLAYER.pactive} />
          <rect x={17} y={3} width={6} height={24} rx={1} fill={PLAYER.poly + '55'} stroke={PLAYER.poly} />
          <Cut x={12} y={11} /><Cut x={12} y={19} />
          <Cut x={28} y={11} /><Cut x={28} y={19} />
        </>
      );
      break;
    case 'resistor':
      body = (
        <>
          <rect x={15} y={4} width={10} height={22} rx={2} fill={PLAYER.res + '50'} stroke={PLAYER.res} />
          <rect x={11} y={3} width={18} height={4} rx={1} fill={PLAYER.met1 + '55'} stroke={PLAYER.met1} strokeWidth={0.6} />
          <rect x={11} y={23} width={18} height={4} rx={1} fill={PLAYER.met1 + '55'} stroke={PLAYER.met1} strokeWidth={0.6} />
        </>
      );
      break;
    case 'capacitor':
      body = (
        <>
          <rect x={6} y={11} width={28} height={15} rx={2} fill={PLAYER.met1 + '50'} stroke={PLAYER.met1} />
          <rect x={12} y={5} width={18} height={14} rx={2} fill={PLAYER.met2 + '55'} stroke={PLAYER.met2} />
          <Cut x={20} y={14} s={5} />
        </>
      );
      break;
    case 'well':
      body = <rect x={4} y={4} width={32} height={22} rx={4} fill={PLAYER.nwell + '33'} stroke={PLAYER.nwell} strokeDasharray="4 2.5" />;
      break;
    case 'guardring':
      body = (
        <>
          <rect x={4} y={4} width={32} height={22} rx={2} fill="none" stroke={PLAYER.nactive} strokeWidth={4} opacity={0.55} />
          <Cut x={11} y={6.5} s={3} /><Cut x={20} y={6.5} s={3} /><Cut x={29} y={6.5} s={3} />
          <Cut x={11} y={23.5} s={3} /><Cut x={20} y={23.5} s={3} /><Cut x={29} y={23.5} s={3} />
        </>
      );
      break;
    case 'block':
    default:
      body = <rect x={4} y={5} width={32} height={20} rx={3} fill={PLAYER.block + '33'} stroke={PLAYER.block} strokeDasharray="1 2" />;
      break;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={40} height={30} className="shrink-0 rounded-md" style={{ background: '#16130e' }}>
      {body}
    </svg>
  );
}
