// Profilanlage und -bearbeitung. Keine Angaben zu Körper oder Gesundheit.

import { h } from '../util/dom.js';
import { PRESETS, STATIONEN, TOLERANZ_LABEL, TEMP_MIN, TEMP_MAX } from '../config.js';
import { speichereProfil } from '../storage/profile.js';
import { exportDatei, pruefeImport } from '../storage/export-import.js';
import { alleEintraege, speichereViele } from '../storage/diary-db.js';
import { popup } from './modal.js';
import { bereiche } from '../logic/rating.js';

function segmente(name, optionen, gewaehlt, onChange) {
  return h('div', { class: 'segmente', role: 'radiogroup' },
    Object.entries(optionen).map(([wert, label]) => h('label', {},
      h('input', { type: 'radio', name, value: wert, checked: wert === gewaehlt, onchange: () => onChange(wert) }),
      h('span', { text: label }))));
}

export function profilAnsicht(ctx) {
  const erststart = !ctx.profil;
  const entwurf = { ...(ctx.profil || { lieblingstemperatur: 20, toleranz: 'mittel', station: 'tiefenbrunnen', preset: null }) };

  const wertAnzeige = h('span', { class: 'regler-wert', 'aria-hidden': 'true' });
  const regler = h('input', {
    type: 'range', min: String(TEMP_MIN), max: String(TEMP_MAX), step: '1', id: 'lieblingstemperatur',
    value: String(entwurf.lieblingstemperatur),
    oninput: () => { entwurf.lieblingstemperatur = Number(regler.value); entwurf.preset = null; aktualisiere(); },
  });
  let toleranzBox = segmente('toleranz', TOLERANZ_LABEL, entwurf.toleranz, (w) => { entwurf.toleranz = w; entwurf.preset = null; aktualisiere(); });
  const toleranzHalter = h('div', {}, toleranzBox);

  const prozent = (t) => `${((t - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * 100}%`;
  const skala = (b) => {
    const balken = (klasse, [von, bis]) => {
      const el = h('span', { class: klasse });
      el.style.left = prozent(von);
      el.style.width = `calc(${prozent(bis)} - ${prozent(von)})`;
      return el;
    };
    return h('span', { class: 'skala', 'aria-hidden': 'true' }, balken('skala-gut', b.gut), balken('skala-ideal', b.ideal));
  };

  // Schwimmtypen: Name, ein Satz in Alltagssprache und der Wohlfühlbereich auf der Temperaturskala.
  const presetKnoepfe = Object.entries(PRESETS).map(([id, p]) => {
    const b = bereiche(p.lieblingstemperatur, p.toleranz);
    return h('button', {
      class: 'typ', type: 'button', 'aria-pressed': 'false',
      'aria-label': `${p.name}: ${p.beschreibung} Ideal ${b.ideal[0]} bis ${b.ideal[1]} Grad.`,
      onclick: () => {
        entwurf.lieblingstemperatur = p.lieblingstemperatur;
        entwurf.toleranz = p.toleranz;
        entwurf.preset = id;
        regler.value = String(p.lieblingstemperatur);
        toleranzBox = segmente('toleranz', TOLERANZ_LABEL, entwurf.toleranz, (w) => { entwurf.toleranz = w; entwurf.preset = null; aktualisiere(); });
        toleranzHalter.replaceChildren(toleranzBox);
        aktualisiere();
      },
    },
    h('span', { class: 'typ-kopf' }, h('span', { class: 'typ-name', text: p.name }), h('span', { class: 'typ-ideal', text: `ideal ${b.ideal[0]}–${b.ideal[1]} °C` })),
    h('span', { class: 'typ-text', text: p.beschreibung }),
    skala(b));
  });

  function aktualisiere() {
    wertAnzeige.textContent = `${entwurf.lieblingstemperatur} °C`;
    regler.setAttribute('aria-valuetext', `${entwurf.lieblingstemperatur} Grad`);
    Object.entries(PRESETS).forEach(([, p], i) => {
      const passt = p.lieblingstemperatur === entwurf.lieblingstemperatur && p.toleranz === entwurf.toleranz;
      presetKnoepfe[i].setAttribute('aria-pressed', passt ? 'true' : 'false');
    });
  }
  aktualisiere();

  const speichern = () => {
    ctx.profil = speichereProfil(entwurf);
    ctx.ansichtStation = ctx.profil.station;
    ctx.navigiere('#start');
  };

  const teile = [
    h('div', { class: 'stapel' },
      h('h1', { text: erststart ? 'Willkommen' : 'Profil' }),
      h('p', { class: 'nebentext', text: erststart
        ? 'Drei Angaben, damit die Bewertung zu dir passt. Gespeichert wird nur auf diesem Gerät, ohne Login.'
        : 'Die Bewertung richtet sich nach diesen Angaben. Gespeichert nur auf diesem Gerät.' })),

    h('section', { class: 'karte stapel' },
      h('div', { class: 'feld' },
        h('h2', { class: 'feld-label', text: 'Welcher Schwimmtyp bist du?' }),
        h('div', { class: 'typen' }, presetKnoepfe),
        h('div', { class: 'skala-legende', 'aria-hidden': 'true' },
          h('span', { text: `${TEMP_MIN} °C` }),
          h('span', { text: 'kräftig: ideal · blass: noch gut' }),
          h('span', { text: `${TEMP_MAX} °C` })),
        h('span', { class: 'feld-hilfe', text: 'Die Auswahl belegt die Werte darunter nur vor. Du kannst sie danach selbst einstellen.' })),

      h('div', { class: 'feld' },
        h('div', { class: 'regler-kopf' }, h('label', { class: 'feld-label', for: 'lieblingstemperatur', text: 'Lieblingstemperatur des Wassers' }), wertAnzeige),
        regler,
        h('div', { class: 'regler-skala', 'aria-hidden': 'true' }, h('span', { text: `${TEMP_MIN} °C` }), h('span', { text: `${TEMP_MAX} °C` }))),

      h('div', { class: 'feld' },
        h('span', { class: 'feld-label', text: 'Toleranz' }),
        toleranzHalter,
        h('span', { class: 'feld-hilfe', text: 'Wie viel Abweichung von deiner Lieblingstemperatur dir noch Spass macht.' })),

      h('div', { class: 'feld' },
        h('span', { class: 'feld-label', text: 'Bevorzugte Badestelle' }),
        segmente('station', Object.fromEntries(Object.values(STATIONEN).map((s) => [s.id, s.name])), entwurf.station, (w) => { entwurf.station = w; }))),

    h('div', { class: 'aktionen' },
      erststart ? h('span') : h('button', { class: 'knopf knopf-text', type: 'button', text: 'Abbrechen', onclick: () => ctx.navigiere('#start') }),
      h('button', { class: 'knopf knopf-primaer', type: 'button', text: erststart ? 'Profil speichern' : 'Speichern', onclick: speichern })),
  ];

  if (!erststart) {
    const datei = h('input', {
      type: 'file', accept: 'application/json,.json', class: 'visuell-versteckt', tabindex: '-1',
      onchange: async () => {
        const f = datei.files[0];
        datei.value = '';
        if (!f) return;
        const bestehende = await alleEintraege();
        const r = pruefeImport(await f.text(), bestehende);
        if (r.fehler) { await popup({ text: r.fehler, knoepfe: [{ label: 'OK', primaer: true }] }); return; }
        if (r.neu.length) await speichereViele(r.neu);
        await ctx.ladeEintraege();
        const teil = r.uebersprungen ? ` ${r.uebersprungen} übersprungen, weil schon vorhanden, ungültig oder zeitgleich mit einem bestehenden Eintrag.` : '';
        await popup({ text: `${r.neu.length} ${r.neu.length === 1 ? 'Eintrag' : 'Einträge'} importiert.${teil}`, knoepfe: [{ label: 'OK', primaer: true }] });
      },
    });
    teile.push(h('section', { class: 'karte stapel', 'aria-label': 'Tagebuch sichern' },
      h('h2', { text: 'Tagebuch sichern' }),
      h('p', { class: 'nebentext klein', text: 'Das Tagebuch liegt nur auf diesem Gerät. Exportiere es als Datei, um es zu sichern oder auf ein anderes Gerät zu übertragen.' }),
      h('div', { class: 'zeile' },
        h('button', { class: 'knopf', type: 'button', text: 'Exportieren', onclick: async () => exportDatei(await alleEintraege(), ctx.heute()) }),
        h('button', { class: 'knopf', type: 'button', text: 'Importieren', onclick: () => datei.click() }),
        datei)));
  }
  return teile;
}
