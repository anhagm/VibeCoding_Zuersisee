// Wasserszene im Hintergrund. Jede Ebene folgt einem Datenwert (siehe logic/scene.js).
// Bei "Bewegung reduzieren", veralteten Daten oder Fehlern steht alles still; nur die Farbe bleibt.

import { starteFisch } from './fisch.js';

let see = null;
let gruende = [];
let aktiverGrund = 0;
let letzterVerlauf = '';

const welle = (fuellung) => `<svg viewBox="0 0 720 70" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 0 H720 V34 C660 50 600 50 540 34 C480 18 420 18 360 34 C300 50 240 50 180 34 C120 18 60 18 0 34 Z" fill="${fuellung}"/></svg>`;

const KAUSTIK = `<svg width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
  <filter id="see-kaustik-filter" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="7"/>
    <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 0"/>
    <feComponentTransfer><feFuncA type="table" tableValues="0 0 0 0.15 1 0.15 0 0 0"/></feComponentTransfer>
    <feGaussianBlur stdDeviation="0.8"/>
  </filter>
  <rect width="100%" height="100%" filter="url(#see-kaustik-filter)"/></svg>`;

function ebene(klasse, inhalt = '') {
  const el = document.createElement('div');
  el.className = klasse;
  if (inhalt) el.innerHTML = inhalt;
  return el;
}

export function starteHintergrund(el) {
  see = el;
  gruende = [ebene('see-grund aktiv'), ebene('see-grund')];
  const wellen = ebene('see-wellen');
  const band1 = ebene('see-welle see-welle-1', welle('rgba(255,255,255,0.30)') + welle('rgba(255,255,255,0.30)'));
  const band2 = ebene('see-welle see-welle-2', welle('rgba(255,255,255,0.16)') + welle('rgba(255,255,255,0.16)'));
  wellen.append(band1, band2);

  const strahlen = ebene('see-strahlen', '<i></i><i></i><i></i>');
  const blasen = ebene('see-blasen', '<i></i><i></i><i></i><i></i><i></i>');
  const beschlag = ebene('see-beschlag', '<div class="see-nebel"></div><i></i><i></i><i></i><i></i><i></i>');

  see.append(...gruende, ebene('see-kaustik', KAUSTIK), strahlen, wellen, blasen, beschlag, ebene('see-blitz'));

  document.addEventListener('visibilitychange', () => see.classList.toggle('pausiert', document.hidden));
  starteFisch();
}

// verlauf: { oben, mitte, unten }   szene: Ergebnis von szene()
export function setzeSzene(verlauf, szene) {
  if (!see) return;
  const schluessel = `${verlauf.oben}${verlauf.mitte}${verlauf.unten}`;
  if (schluessel !== letzterVerlauf) {
    letzterVerlauf = schluessel;
    // Weiche Überblendung zwischen zwei Verläufen.
    aktiverGrund = 1 - aktiverGrund;
    const neu = gruende[aktiverGrund];
    neu.style.background = `linear-gradient(180deg, ${verlauf.oben} 0%, ${verlauf.mitte} 40%, ${verlauf.unten} 100%)`;
    neu.classList.add('aktiv');
    gruende[1 - aktiverGrund].classList.remove('aktiv');
    document.body.style.backgroundColor = verlauf.unten;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', verlauf.oben);
  }
  see.style.setProperty('--kaustik', String(szene.kaustik));
  see.style.setProperty('--strahlen', String(szene.strahlen));
  see.style.setProperty('--blasen', String(szene.blasen));
  see.style.setProperty('--welle-dauer', `${szene.welleSek}s`);
  see.classList.toggle('mit-beschlag', szene.beschlag > 0);
  see.classList.toggle('mit-blitz', Boolean(szene.blitz));
  see.classList.toggle('still', Boolean(szene.still));
}
