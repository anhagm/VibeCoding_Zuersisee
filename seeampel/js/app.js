// Einstieg: Zustand, Datenquellen, Routing und Ladesequenz.

import { STATIONEN } from './config.js';
import { h, leeren } from './util/dom.js';
import { lokalIso, datumTeil } from './util/zeit.js';
import { ladeMessung, normalisiereMessung, ladeHistorischeMessung } from './data/measurement.js';
import { ladePrognose, normalisierePrognose } from './data/forecast.js';
import { szenario, testMessungJson, testPrognoseJson, testTagebuch } from './data/scenarios.js';
import { ladeProfil, speichereProfil, nutzeFluechtigenSpeicher } from './storage/profile.js';
import { alleEintraege, nutzeDatenbank, leeren as tagebuchLeeren, speichereViele } from './storage/diary-db.js';
import { starteHintergrund, setzeDunkel } from './ui/background.js';
import { einblendenNachLaden } from './ui/loader.js';
import { startAnsicht } from './ui/home-view.js';
import { profilAnsicht } from './ui/profile-view.js';
import { tagebuchAnsicht, tagebuchZuruecksetzen } from './ui/diary-view.js';

const params = new URLSearchParams(location.search);
const test = params.has('test') ? szenario(params.get('test')) || szenario('normal') : null;
const testUhr = params.get('uhr');

const dunkelMq = window.matchMedia('(prefers-color-scheme: dark)');

function jetztDate() {
  // Im Testmodus lässt sich die Uhrzeit festlegen: ?test=normal&uhr=14
  if (test && testUhr) {
    const d = new Date();
    const iso = lokalIso(d);
    const [hh, mm = '0'] = testUhr.split(':');
    const diff = (Number(hh) * 60 + Number(mm)) - (Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16)));
    return new Date(d.getTime() + diff * 60000);
  }
  return new Date();
}

// Datenquelle: echt oder Testszenario, gleiche Schnittstelle.
const quelle = test
  ? {
    async messung(station) {
      if (test.offline) throw Object.assign(new Error('offline'), { art: 'quelle' });
      return testMessungJson(test, station, jetztDate());
    },
    async prognose(station) {
      if (test.offline) throw Object.assign(new Error('offline'), { art: 'quelle' });
      return testPrognoseJson(test, station, lokalIso(jetztDate()));
    },
    async historisch(station, date) {
      if (test.offline) return null;
      const n = normalisiereMessung(testMessungJson({ ...test, alterMin: 0 }, station, date), date.getTime());
      return n.ok ? n.messung : null;
    },
  }
  : {
    messung: (station) => ladeMessung(station),
    prognose: (station) => ladePrognose(station),
    historisch: (station, date) => ladeHistorischeMessung(station, date),
  };

const ctx = {
  test,
  quelle,
  profil: null,
  ansichtStation: 'tiefenbrunnen',
  stationen: {},
  eintraege: [],
  dunkel: dunkelMq.matches,
  geladenUm: 0,
  jetzt: () => lokalIso(jetztDate()),
  heute: () => datumTeil(lokalIso(jetztDate())),
  navigiere(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  },
  render: () => render(),
  ladeStationen: (opt) => ladeStationen(opt),
  ladeEintraege: () => ladeEintraege(),
};

async function ladeStation(station) {
  try {
    const [mj, pj] = await Promise.all([quelle.messung(station), quelle.prognose(station)]);
    const m = normalisiereMessung(mj, jetztDate().getTime());
    if (!m.ok) return { status: 'fehler', art: 'ungueltig' };
    const p = normalisierePrognose(pj);
    if (!p) return { status: 'fehler', art: 'prognose' };
    return { status: 'ok', messung: m.messung, prognose: p };
  } catch {
    return { status: 'fehler', art: 'quelle' };
  }
}

async function ladeStationen({ neu = false } = {}) {
  if (neu) {
    for (const id of Object.keys(STATIONEN)) ctx.stationen[id] = { status: 'laden' };
    if (route() === 'start') render();
  }
  const ergebnisse = await Promise.all(Object.keys(STATIONEN).map(async (id) => [id, await ladeStation(id)]));
  for (const [id, r] of ergebnisse) ctx.stationen[id] = r;
  ctx.geladenUm = Date.now();
  if (route() === 'start' && document.getElementById('app').classList.contains('sichtbar')) render();
}

async function ladeEintraege() {
  try {
    ctx.eintraege = await alleEintraege();
  } catch {
    ctx.eintraege = [];
  }
}

function route() {
  if (!ctx.profil) return 'profil';
  const r = location.hash.replace('#', '');
  return ['tagebuch', 'profil'].includes(r) ? r : 'start';
}

function kopf(r) {
  const titel = h('div', { class: 'kopf-titel' },
    h('h1', { text: 'Seeampel' }),
    ctx.profil ? h('span', { class: 'sehr-klein nebentext', text: `Zürichsee · ${STATIONEN[ctx.ansichtStation].name}` }) : null);
  const aktionen = ctx.profil
    ? h('nav', { class: 'kopf-aktionen', 'aria-label': 'Navigation' },
      r !== 'tagebuch' ? h('button', { class: 'knopf knopf-text', type: 'button', text: 'Tagebuch', onclick: () => ctx.navigiere('#tagebuch') }) : null,
      h('button', { class: 'knopf', type: 'button', text: 'Profil', 'aria-current': r === 'profil' ? 'page' : null, onclick: () => ctx.navigiere('#profil') }))
    : null;
  return h('header', { class: 'kopf' }, titel, aktionen);
}

function fuss() {
  return h('footer', { class: 'fuss' },
    h('p', {}, h('strong', { text: 'Keine offizielle Unwetterwarnung. Im Zweifel: nicht schwimmen.' })),
    h('p', { text: 'Messwerte: Wasserschutzpolizei Zürich via Tecdottir. Prognose: Open-Meteo / MeteoSchweiz ICON-CH, CC BY 4.0.' }),
    test ? h('p', { class: 'warnung', text: `Testmodus: ${test.name} – keine echten Wetterdaten` }) : null);
}

let letzteRoute = null;
function render() {
  const app = document.getElementById('app');
  const r = route();
  if (r !== letzteRoute && letzteRoute === 'tagebuch') tagebuchZuruecksetzen();
  const wechsel = r !== letzteRoute;
  letzteRoute = r;

  let inhalt;
  if (r === 'profil') inhalt = profilAnsicht(ctx);
  else if (r === 'tagebuch') inhalt = tagebuchAnsicht(ctx);
  else inhalt = startAnsicht(ctx);

  leeren(app);
  app.append(kopf(r), h('main', { id: 'inhalt' }, inhalt), fuss());
  if (wechsel) window.scrollTo({ top: 0 });
}

async function start() {
  if (test) {
    nutzeFluechtigenSpeicher();
    nutzeDatenbank('seeampel-test');
    await tagebuchLeeren().catch(() => {});
    if (test.tagebuch === 'beispiel') await speichereViele(testTagebuch(ctx.heute())).catch(() => {});
    if (!test.erststart) {
      speichereProfil({ lieblingstemperatur: 23, toleranz: 'mittel', station: 'tiefenbrunnen', preset: 'suenneler' });
    }
  }

  starteHintergrund(document.getElementById('hintergrund'), { istDunkel: ctx.dunkel });
  ctx.profil = ladeProfil();
  if (ctx.profil) ctx.ansichtStation = ctx.profil.station;

  const daten = Promise.all([ladeStationen(), ladeEintraege()]);
  await einblendenNachLaden(daten, render);

  window.addEventListener('hashchange', render);
  dunkelMq.addEventListener('change', (e) => { ctx.dunkel = e.matches; setzeDunkel(e.matches); render(); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - ctx.geladenUm > 10 * 60000) ladeStationen();
  });

  // Lokal kein Service Worker, damit Änderungen sofort sichtbar sind.
  const lokal = ['localhost', '127.0.0.1'].includes(location.hostname);
  if ('serviceWorker' in navigator && !test && !lokal) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}

start();
