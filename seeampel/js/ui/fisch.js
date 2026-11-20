// Fischlein am Desktop: Steht die Maus 2 Sekunden still, schwimmt ein Fisch zu ihr.
// Bewegt sich die Maus, flüchtet er. Er folgt den Daten wie die übrige Szene:
// kein Fisch beim Veto, bei veralteten Daten oder Fehlern; kaltes Wasser macht ihn träge.
// Nur mit Maus (hover + feiner Zeiger), nie bei "Bewegung reduzieren".

const WARTEN_MS = 2000;
const ABSTAND = 46;        // so nahe kommt er an den Zeiger
const FLUCHT_RADIUS = 160; // so nahe darf die Maus kommen, bevor er flüchtet

let el = null;
let erlaubt = false;
let tempo = 1;             // aus der Wassertemperatur
let maus = null;
let timer = null;
let raf = null;
let zustand = 'weg';       // weg | kommt | da | flieht
let pos = { x: 0, y: 0 };
let ziel = { x: 0, y: 0 };
let letzteZeit = 0;

const FISCH_SVG = `<svg viewBox="0 0 48 24" width="44" height="22" aria-hidden="true">
  <g class="fisch-schwanz"><path d="M40 12 L48 4 L47 12 L48 20 Z" /></g>
  <ellipse cx="22" cy="12" rx="19" ry="8.5" />
  <path d="M20 4.5 C24 1 28 1.5 30 4.5 Z" class="fisch-flosse" />
  <circle cx="10" cy="10.5" r="1.6" class="fisch-auge" />
</svg>`;

export function starteFisch() {
  const geeignet = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduziert = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!geeignet.matches || reduziert.matches) return;

  el = document.createElement('div');
  el.className = 'fisch';
  el.innerHTML = FISCH_SVG;
  // Über dem Inhalt, damit er nicht hinter Karten verschwindet; Klicks gehen durch.
  document.body.append(el);

  window.addEventListener('mousemove', (e) => {
    maus = { x: e.clientX, y: e.clientY };
    clearTimeout(timer);
    if (zustand === 'kommt' || zustand === 'da') {
      const d = Math.hypot(maus.x - pos.x, maus.y - pos.y);
      if (zustand === 'da' || d < FLUCHT_RADIUS) fliehen();
    }
    if (erlaubt && zustand === 'weg') timer = setTimeout(kommen, WARTEN_MS);
  }, { passive: true });
  document.addEventListener('mouseleave', () => { clearTimeout(timer); if (zustand !== 'weg') fliehen(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) verschwinden(); });
}

// Von der Szene gesetzt: darf ein Fisch kommen, und wie warm ist das Wasser?
export function setzeFisch({ darf, wasser }) {
  erlaubt = Boolean(darf);
  tempo = wasser == null ? 1 : Math.min(1.4, Math.max(0.5, (wasser - 4) / 16));
  if (!erlaubt && zustand !== 'weg') fliehen();
}

function kommen() {
  if (!erlaubt || !maus || !el) return;
  const vonLinks = maus.x < window.innerWidth / 2; // vom näheren Rand
  pos = { x: vonLinks ? -60 : window.innerWidth + 60, y: maus.y + (Math.random() * 120 - 60) };
  zustand = 'kommt';
  el.classList.add('sichtbar');
  starteSchleife();
}

function fliehen() {
  if (!el || zustand === 'weg') return;
  zustand = 'flieht';
  const nachLinks = maus ? pos.x < maus.x : pos.x < window.innerWidth / 2;
  ziel = { x: nachLinks ? -120 : window.innerWidth + 120, y: pos.y + (Math.random() * 160 - 80) };
  starteSchleife();
}

function verschwinden() {
  zustand = 'weg';
  if (el) el.classList.remove('sichtbar');
  cancelAnimationFrame(raf);
  raf = null;
  // Bleibt die Maus danach still, kommt er nach 2 Sekunden wieder.
  clearTimeout(timer);
  if (erlaubt && maus && !document.hidden) timer = setTimeout(kommen, WARTEN_MS);
}

function starteSchleife() {
  if (raf) return;
  letzteZeit = performance.now();
  raf = requestAnimationFrame(schritt);
}

function schritt(t) {
  const dt = Math.min(0.05, (t - letzteZeit) / 1000);
  letzteZeit = t;

  if (zustand === 'kommt' || zustand === 'da') {
    // Ziel: knapp neben dem Zeiger, auf der Seite, von der er kommt.
    const seite = pos.x < maus.x ? -1 : 1;
    ziel = { x: maus.x + seite * ABSTAND, y: maus.y + 6 };
  }

  const dx = ziel.x - pos.x;
  const dy = ziel.y - pos.y;
  const d = Math.hypot(dx, dy);
  const max = (zustand === 'flieht' ? 700 : 380) * tempo;
  const v = Math.min(max, d * (zustand === 'flieht' ? 6 : 2.4));
  if (d > 0.5) {
    pos.x += (dx / d) * v * dt;
    pos.y += (dy / d) * v * dt;
  }

  const blickNachLinks = dx < 0;
  const neigung = Math.max(-20, Math.min(20, (dy / Math.max(1, Math.abs(dx))) * 20));
  el.style.transform = `translate(${pos.x - 22}px, ${pos.y - 11}px) scaleX(${blickNachLinks ? 1 : -1}) rotate(${blickNachLinks ? neigung : -neigung}deg)`;
  el.classList.toggle('schnell', zustand === 'flieht' || v > 120);

  if (zustand === 'kommt' && d < 4) zustand = 'da';
  if (zustand === 'flieht' && (pos.x < -100 || pos.x > window.innerWidth + 100)) {
    verschwinden();
    return;
  }
  raf = requestAnimationFrame(schritt);
}
