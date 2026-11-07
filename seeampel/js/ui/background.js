// Ruhige Wasseranimation in der Seefarbe. Bei "Bewegung reduzieren" nur Farbe.

import { hexZuRgb, rgbZuHex } from '../logic/sea-color.js';

let canvas, ctx, raf = null;
let aktuell = null;
let ziel = [195, 224, 232];
let dunkel = false;
let reduziert = false;
let t0 = performance.now();

const reduziertMq = window.matchMedia('(prefers-reduced-motion: reduce)');

export function starteHintergrund(el, { istDunkel }) {
  canvas = el;
  ctx = canvas.getContext('2d');
  dunkel = istDunkel;
  // Startfarbe aus CSS, damit der Dunkelmodus nicht von einer hellen Farbe her einblendet.
  const css = getComputedStyle(document.documentElement).getPropertyValue('--see').trim();
  if (/^#[0-9a-f]{6}$/i.test(css)) { ziel = hexZuRgb(css); aktuell = [...ziel]; }
  reduziert = reduziertMq.matches;
  reduziertMq.addEventListener('change', (e) => { reduziert = e.matches; neuStarten(); });
  window.addEventListener('resize', groesse);
  document.addEventListener('visibilitychange', neuStarten);
  groesse();
  neuStarten();
}

export function setzeDunkel(wert) {
  dunkel = wert;
  aktuell = null;
  zeichne(performance.now());
}

export function setzeSeefarbe(hex) {
  ziel = hexZuRgb(hex);
  if (!aktuell) aktuell = [...ziel];
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', hex);
  document.body.style.background = hex;
  if (reduziert) zeichne(performance.now());
}

function groesse() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  zeichne(performance.now());
}

function neuStarten() {
  if (raf) cancelAnimationFrame(raf);
  raf = null;
  if (reduziert || document.hidden) {
    if (aktuell) aktuell = [...ziel];
    zeichne(performance.now(), true);
    return;
  }
  const schleife = (t) => { zeichne(t); raf = requestAnimationFrame(schleife); };
  raf = requestAnimationFrame(schleife);
}

const ton = (rgb, d) => rgbZuHex(rgb.map((v) => v + d));

function zeichne(t, statisch = false) {
  if (!ctx) return;
  if (!aktuell) aktuell = [...ziel];
  // Farbe gleitet weich zur Zielfarbe.
  aktuell = aktuell.map((v, i) => v + (ziel[i] - v) * (statisch || reduziert ? 1 : 0.05));

  const w = window.innerWidth;
  const hgt = window.innerHeight;
  ctx.fillStyle = rgbZuHex(aktuell);
  ctx.fillRect(0, 0, w, hgt);
  if (reduziert) return;

  const s = (t - t0) / 1000;
  const schichten = [
    { y: 0.38, amp: 14, laenge: 420, tempo: 0.12, d: dunkel ? 3 : -4, alpha: 0.35 },
    { y: 0.55, amp: 18, laenge: 560, tempo: -0.08, d: dunkel ? 5 : -6, alpha: 0.30 },
    { y: 0.72, amp: 12, laenge: 360, tempo: 0.10, d: dunkel ? 7 : -8, alpha: 0.28 },
  ];
  for (const sch of schichten) {
    ctx.beginPath();
    const basis = hgt * sch.y;
    ctx.moveTo(0, hgt);
    for (let x = 0; x <= w + 8; x += 8) {
      const y = basis +
        Math.sin((x / sch.laenge) * Math.PI * 2 + s * sch.tempo * Math.PI * 2) * sch.amp +
        Math.sin((x / (sch.laenge * 0.53)) * Math.PI * 2 - s * sch.tempo * 1.7) * sch.amp * 0.35;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, hgt);
    ctx.closePath();
    ctx.globalAlpha = sch.alpha;
    ctx.fillStyle = ton(aktuell, sch.d);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
