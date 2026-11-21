// Profilanlage und -bearbeitung. Keine Angaben zu Körper oder Gesundheit.

import { h } from '../util/dom.js';
import { PRESETS, STATIONEN, TOLERANZ_LABEL, TEMP_MIN, TEMP_MAX } from '../config.js';
import { speichereProfil, loescheProfil, SCHWIMMARTEN, NAME_MAX } from '../storage/profile.js';
import { exportDatei, csvDatei, pruefeImport } from '../storage/export-import.js';
import { alleEintraege, speichereViele, leeren as tagebuchLeeren } from '../storage/diary-db.js';
import { popup, bestaetigen } from './modal.js';
import { tagebuchZuruecksetzen } from './diary-view.js';
import { bereiche } from '../logic/rating.js';

function segmente(name, optionen, gewaehlt, onChange) {
  return h('div', { class: 'segmente', role: 'radiogroup' },
    Object.entries(optionen).map(([wert, label]) => h('label', {},
      h('input', { type: 'radio', name, value: wert, checked: wert === gewaehlt, onchange: () => onChange(wert) }),
      h('span', { text: label }))));
}

export function profilAnsicht(ctx) {
  const erststart = !ctx.profil;
  const entwurf = { ...(ctx.profil || { lieblingstemperatur: 20, toleranz: 'mittel', station: 'tiefenbrunnen', preset: null, name: '', art: 'geniessen', wochenziel: 5 }) };

  // Über dich: Name (freiwillig) und Schwimmart. Das Wochenziel erscheint nur beim Trainieren.
  const nameFeld = h('input', {
    class: 'eingabe', id: 'name', type: 'text', autocomplete: 'given-name', maxlength: String(NAME_MAX),
    placeholder: 'Vorname', value: entwurf.name || '',
    oninput: () => { entwurf.name = nameFeld.value; },
  });
  const zielFeld = h('input', {
    class: 'eingabe eingabe-kurz', id: 'wochenziel', type: 'text', inputmode: 'decimal', autocomplete: 'off',
    value: String(entwurf.wochenziel ?? 5).replace('.', ','),
  });
  const zielBox = h('div', { class: 'feld', hidden: entwurf.art !== 'trainieren' },
    h('label', { class: 'feld-label', for: 'wochenziel', text: 'Wochenziel in km' }),
    zielFeld,
    h('span', { class: 'feld-hilfe', text: 'Erscheint als Linie im Diagramm deines Tagebuchs.' }));
  const artBox = segmente('art', SCHWIMMARTEN, entwurf.art, (w) => { entwurf.art = w; zielBox.hidden = w !== 'trainieren'; });

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

  const speichern = async () => {
    const ziel = Number(String(zielFeld.value).trim().replace(',', '.'));
    if (entwurf.art === 'trainieren' && !(ziel >= 1 && ziel <= 100)) {
      await popup({ text: 'Das Wochenziel muss zwischen 1 und 100 km liegen.' });
      zielFeld.focus();
      return;
    }
    if (entwurf.art === 'trainieren') entwurf.wochenziel = ziel;
    ctx.profil = speichereProfil(entwurf);
    ctx.ansichtStation = ctx.profil.station;
    ctx.navigiere('#start');
  };

  const teile = [
    h('div', { class: 'stapel' },
      h('h1', { text: erststart ? 'Willkommen' : 'Profil' }),
      h('p', { class: 'nebentext', text: erststart
        ? 'Ein paar Angaben, damit die Bewertung zu dir passt. Gespeichert wird nur auf diesem Gerät, ohne Login.'
        : 'Die Bewertung richtet sich nach diesen Angaben. Gespeichert nur auf diesem Gerät.' })),

    h('section', { class: 'karte stapel', 'aria-label': 'Über dich' },
      h('div', { class: 'feld' },
        h('label', { class: 'feld-label', for: 'name', text: 'Wie heisst du? (freiwillig)' }),
        nameFeld,
        h('span', { class: 'feld-hilfe', text: 'Erscheint über deiner Bewertung: «Jetzt · für …»' })),
      h('div', { class: 'feld' },
        h('span', { class: 'feld-label', text: 'Wie schwimmst du?' }),
        artBox,
        h('span', { class: 'feld-hilfe', text: 'Beim Trainieren zeigt das Tagebuch Tempo und Wochenziel, beim Geniessen die Zeit im Wasser.' })),
      zielBox),

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
      type: 'file', accept: 'application/json,.json', class: 'visuell-versteckt', tabindex: '-1', 'aria-label': 'Sicherung importieren',
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
    const stationName = (id) => STATIONEN[id]?.name || id;
    const sichern = async () => exportDatei(await alleEintraege(), ctx.heute());

    teile.push(h('section', { class: 'karte stapel', 'aria-label': 'Tagebuch herunterladen' },
      h('h2', { text: 'Tagebuch herunterladen' }),
      h('p', { class: 'nebentext klein', text: 'Als Tabelle für Excel, Numbers oder Google Sheets. Die Sicherung brauchst du, um das Tagebuch auf ein anderes Gerät zu übertragen.' }),
      h('div', { class: 'zeile' },
        h('button', { class: 'knopf', type: 'button', text: 'Tabelle (CSV)', onclick: async () => csvDatei(await alleEintraege(), ctx.heute(), stationName) }),
        h('button', { class: 'knopf', type: 'button', text: 'Sicherung', onclick: sichern }),
        h('button', { class: 'knopf knopf-text', type: 'button', text: 'Sicherung importieren', onclick: () => datei.click() }),
        datei)));

    teile.push(h('a', { class: 'knopf knopf-breit hilfe-link', href: '#hilfe', text: 'Hilfe und Anleitung' }));

    // Bewusst unauffällig am Schluss: Daten auf diesem Gerät löschen.
    const zuruecksetzen = async () => {
      const ok = await bestaetigen({
        titel: 'Profil zurücksetzen?',
        text: 'Name, Schwimmtyp, Lieblingstemperatur und Badestelle werden gelöscht. Dein Tagebuch bleibt erhalten.',
        ja: 'Zurücksetzen', gefahr: true,
      });
      if (!ok) return;
      loescheProfil();
      ctx.profil = null;
      ctx.navigiere('#start');
    };
    const allesLoeschen = async () => {
      for (;;) {
        const wahl = await popup({
          titel: 'Alle Daten löschen?',
          text: `Profil und Tagebuch mit ${ctx.eintraege.length} ${ctx.eintraege.length === 1 ? 'Eintrag' : 'Einträgen'} werden von diesem Gerät gelöscht. Das lässt sich nicht rückgängig machen.`,
          knoepfe: [
            { label: 'Abbrechen', wert: false },
            { label: 'Zuerst sichern', wert: 'sichern' },
            { label: 'Alles löschen', gefahr: true, wert: true },
          ],
        });
        if (wahl === 'sichern') { await sichern(); continue; }
        if (wahl !== true) return;
        break;
      }
      await tagebuchLeeren();
      loescheProfil();
      tagebuchZuruecksetzen();
      await ctx.ladeEintraege();
      ctx.profil = null;
      ctx.navigiere('#start');
    };
    teile.push(h('section', { class: 'daten-geraet', 'aria-label': 'Daten auf diesem Gerät' },
      h('h2', { class: 'abschnitt-titel', text: 'Daten auf diesem Gerät' }),
      h('div', { class: 'zeile' },
        h('button', { class: 'knopf knopf-text knopf-gefahr', type: 'button', text: 'Profil zurücksetzen', onclick: zuruecksetzen }),
        h('button', { class: 'knopf knopf-text knopf-gefahr', type: 'button', text: 'Alle Daten löschen', onclick: allesLoeschen }))));
  }
  return teile;
}
