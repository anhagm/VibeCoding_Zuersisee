// Ladesequenz: zuerst nur die Wasseranimation, dann nach 0,8–1,5 s Fade-in des Inhalts.

import { LADEN } from '../config.js';

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

export async function einblendenNachLaden(datenPromise, render, { minMs, maxMs } = LADEN) {
  const start = performance.now();
  await Promise.race([Promise.resolve(datenPromise).catch(() => {}), warte(maxMs)]);
  const vergangen = performance.now() - start;
  if (vergangen < minMs) await warte(minMs - vergangen);
  render();
  requestAnimationFrame(() => document.getElementById('app').classList.add('sichtbar'));
}
