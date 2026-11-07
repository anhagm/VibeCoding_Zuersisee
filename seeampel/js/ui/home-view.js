// Startbildschirm: Bewertung zuerst, alles andere ordnet sich unter.

import { h } from '../util/dom.js';
import { STATIONEN } from '../config.js';
import { rate } from '../logic/rating.js';
import { besteZeitfenster } from '../logic/best-window.js';
import { vergleicheStellen } from '../logic/compare.js';
import { tipp } from '../logic/tips.js';
import { seeFarbe } from '../logic/sea-color.js';
import { bewertungKarte, messKarte, hinweise, messzeit } from './rating-card.js';
import { statistikKarte } from './stats-chart.js';
import { setzeSeefarbe } from './background.js';

export function bewertungFuer(ctx, station) {
  const d = ctx.stationen[station];
  if (!d || d.status !== 'ok') return d || { status: 'laden' };
  const r = rate(d.messung, d.prognose, ctx.profil, ctx.jetzt());
  if (r.fehler) return { status: 'fehler', art: r.fehler };
  return { status: 'ok', ergebnis: r, messung: d.messung, prognose: d.prognose };
}

export function startAnsicht(ctx) {
  const station = ctx.ansichtStation;
  const andere = station === 'tiefenbrunnen' ? 'mythenquai' : 'tiefenbrunnen';
  const name = STATIONEN[station].name;
  const hier = bewertungFuer(ctx, station);
  const teile = [];

  teile.push(bewertungKarte({
    status: hier.status, art: hier.art, ergebnis: hier.ergebnis, stationName: name,
    onNochmals: () => ctx.ladeStationen({ neu: true }),
  }));

  if (hier.status === 'ok') {
    const { messung, prognose, ergebnis } = hier;
    teile.push(messKarte(messung, prognose, ctx.jetzt()));

    const dort = bewertungFuer(ctx, andere);
    const vergleich = dort.status === 'ok'
      ? vergleicheStellen(ergebnis, dort.ergebnis, STATIONEN[andere].name, ctx.profil)
      : null;

    teile.push(hinweise({
      fenster: besteZeitfenster(messung.wasser, prognose.stunden, ctx.profil, ctx.jetzt()),
      vergleich,
      tipp: ergebnis.veto ? null : tipp(messung, prognose.aktuell),
      onWechsel: () => { ctx.ansichtStation = andere; ctx.render(); window.scrollTo({ top: 0 }); },
    }));
  }

  if (station !== ctx.profil.station) {
    teile.push(h('button', {
      class: 'knopf knopf-text', type: 'button',
      text: `Zurück zu ${STATIONEN[ctx.profil.station].name}`,
      onclick: () => { ctx.ansichtStation = ctx.profil.station; ctx.render(); },
    }));
  }

  teile.push(statistikKarte(ctx.eintraege, ctx.heute(), () => ctx.navigiere('#tagebuch')));

  if (hier.status === 'ok') teile.push(messzeit(hier.messung, name));

  setzeSeefarbe(seeFarbe({
    wasser: hier.status === 'ok' ? hier.messung.wasser : null,
    bewoelkung: hier.status === 'ok' ? hier.prognose.aktuell.bewoelkung : null,
    veraltet: hier.status === 'ok' ? hier.messung.veraltet : hier.status === 'fehler',
    veto: hier.status === 'ok' && Boolean(hier.ergebnis.veto),
    dunkel: ctx.dunkel,
  }));

  return teile;
}
