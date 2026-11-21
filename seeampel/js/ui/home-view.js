// Startbildschirm: Bewertung zuerst, alles andere ordnet sich unter.
// Mobil eine Spalte, am Desktop links Bewertung und Messwerte, rechts Hinweise und Tagebuch.

import { h } from '../util/dom.js';
import { STATIONEN } from '../config.js';
import { rate } from '../logic/rating.js';
import { besteZeitfenster } from '../logic/best-window.js';
import { vergleicheStellen } from '../logic/compare.js';
import { tipp } from '../logic/tips.js';
import { seeVerlauf } from '../logic/sea-color.js';
import { szene } from '../logic/scene.js';
import { sterneText } from '../util/format.js';
import { bewertungKarte, messKarte, hinweise, badestellen, messzeit } from './rating-card.js';
import { statistikKarte } from './stats-chart.js';
import { setzeSzene } from './background.js';
import { setzeFisch } from './fisch.js';

export function bewertungFuer(ctx, station) {
  const d = ctx.stationen[station];
  if (!d || d.status !== 'ok') return d || { status: 'laden' };
  const r = rate(d.messung, d.prognose, ctx.profil, ctx.jetzt());
  if (r.fehler) return { status: 'fehler', art: r.fehler };
  return { status: 'ok', ergebnis: r, messung: d.messung, prognose: d.prognose };
}

const mit = (klasse, el) => {
  if (el) el.classList.add(klasse);
  return el;
};

export function startAnsicht(ctx) {
  const station = ctx.ansichtStation;
  const andere = station === 'tiefenbrunnen' ? 'mythenquai' : 'tiefenbrunnen';
  const name = STATIONEN[station].name;
  const hier = bewertungFuer(ctx, station);
  const dort = bewertungFuer(ctx, andere);
  const wechseln = (id) => { ctx.ansichtStation = id; ctx.render(); window.scrollTo({ top: 0 }); };

  const links = h('div', { class: 'start-links' });
  const rechts = h('div', { class: 'start-rechts' });

  links.append(mit('bereich-held', bewertungKarte({
    status: hier.status, art: hier.art, ergebnis: hier.ergebnis, name: ctx.profil.name,
    onNochmals: () => ctx.ladeStationen({ neu: true }),
  })));

  if (hier.status === 'ok') {
    const { messung, prognose, ergebnis } = hier;
    links.append(mit('bereich-mess', messKarte(messung, prognose, ctx.jetzt())));
    links.append(mit('bereich-zeit', messzeit(messung, name)));

    const vergleich = dort.status === 'ok' ? vergleicheStellen(ergebnis, dort.ergebnis, STATIONEN[andere].name, ctx.profil) : null;
    rechts.append(mit('bereich-hinweise', hinweise({
      fenster: besteZeitfenster(messung.wasser, prognose.stunden, ctx.profil, ctx.jetzt()),
      vergleich,
      tipp: ergebnis.veto ? null : tipp(messung, prognose.aktuell),
      onWechsel: () => wechseln(andere),
    })));
  }

  const ortInfo = (id, b) => {
    if (b.status !== 'ok') return { sterne: 'keine Daten', info: '' };
    return { sterne: b.ergebnis.veto ? 'Warnung' : sterneText(b.ergebnis.sterne), info: '' };
  };
  const orte = [station, andere].map((id) => {
    const b = id === station ? hier : dort;
    const o = ortInfo(id, b);
    return {
      id, name: STATIONEN[id].name, aktiv: id === station, sterne: o.sterne,
      info: id === station ? (id === ctx.profil.station ? 'deine Badestelle · angezeigt' : 'angezeigt') : (id === ctx.profil.station ? 'deine Badestelle · antippen' : 'antippen zum Wechseln'),
    };
  });
  rechts.append(mit('bereich-orte', badestellen({ orte, onWahl: wechseln })));

  if (station !== ctx.profil.station) {
    rechts.append(mit('bereich-orte', h('button', {
      class: 'knopf knopf-text', type: 'button',
      text: `Zurück zu ${STATIONEN[ctx.profil.station].name}`,
      onclick: () => wechseln(ctx.profil.station),
    })));
  }

  rechts.append(mit('bereich-tagebuch', statistikKarte(ctx.eintraege, ctx.heute(), {
    onEintragen: () => { ctx.fokusFormular = true; ctx.navigiere('#tagebuch'); },
    onOeffnen: () => ctx.navigiere('#tagebuch'),
    art: ctx.profil.art,
    wochenziel: ctx.profil.wochenziel,
  })));

  // Wasserszene und Farben folgen den Daten.
  const ok = hier.status === 'ok';
  const veto = ok && Boolean(hier.ergebnis.veto);
  document.body.classList.toggle('veto', veto);
  // Fischlein nur, wenn das Wasser einladend ist: frische Daten, kein Veto.
  setzeFisch({ darf: ok && !veto && !hier.messung.veraltet, wasser: ok ? hier.messung.wasser : null });

  setzeSzene(
    seeVerlauf({
      wasser: ok ? hier.messung.wasser : null,
      bewoelkung: ok ? hier.prognose.aktuell.bewoelkung : null,
      veraltet: ok ? hier.messung.veraltet : hier.status === 'fehler',
      veto,
      dunkel: ctx.dunkel,
    }),
    szene({
      messung: ok ? hier.messung : null,
      aktuell: ok ? hier.prognose.aktuell : null,
      veto: veto ? hier.ergebnis.veto : null,
      fehler: hier.status === 'fehler',
    }),
  );

  return [h('div', { class: 'start' }, links, rechts)];
}
