interface ColorStop {
  count: number;
  core: [number, number, number];
  glow: [number, number, number];
  bg: [number, number, number];
}

const STOPS: ColorStop[] = [
  { count: 0,  core: [46, 139, 87],  glow: [60, 179, 113],  bg: [5, 15, 10] },
  { count: 3,  core: [255, 215, 0],  glow: [255, 165, 0],   bg: [15, 12, 5] },
  { count: 6,  core: [255, 69, 0],   glow: [255, 99, 71],   bg: [15, 8, 5] },
  { count: 10, core: [220, 20, 60],  glow: [178, 34, 34],   bg: [15, 5, 5] },
  { count: 15, core: [139, 0, 0],    glow: [100, 0, 0],     bg: [10, 2, 2] },
];

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function toHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map(v => Math.min(255, Math.max(0, v)).toString(16).padStart(2, '0')).join('');
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number) {
  return toHex(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t));
}

export function getEmberColors(count: number) {
  const c = Math.max(0, Math.min(count, 16));
  let lo = STOPS[0], hi = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (c >= STOPS[i].count && c <= STOPS[i + 1].count) {
      lo = STOPS[i];
      hi = STOPS[i + 1];
      break;
    }
  }
  const range = hi.count - lo.count;
  const t = range === 0 ? 1 : (c - lo.count) / range;

  return {
    core: lerpColor(lo.core, hi.core, t),
    glow: lerpColor(lo.glow, hi.glow, t),
    bg: lerpColor(lo.bg, hi.bg, t),
    intensity: Math.min(c / 15, 1),
  };
}

export function brighten(hex: string, factor: number) {
  const r = Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) * factor));
  const g = Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) * factor));
  const b = Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) * factor));
  return toHex(r, g, b);
}

export function withAlpha(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
