// Schwimmtagebuch: Kalender, Scroll-Räder, Strecke, Kommentar, Liste der Einträge.

import { h, ICON, leeren } from '../util/dom.js';
import { STATIONEN, TAGEBUCH, TEMPO } from '../config.js';
import { pruefeEintrag } from '../logic/diary-validation.js';
import { speichereEintrag, loescheEintrag, neueId } from '../storage/diary-db.js';
import { kalender } from './calendar.js';
import { zeitRad } from './time-wheel.js';
import { popup, bestaetigen } from './modal.js';
import { datumLang, datumKurz, km, zahl, ganz, monatTitel } from '../util/format.js';
import { minutenZuText, lokalZuDate } from '../util/zeit.js';
import { paceText, paceEintrag, schaetzeStrecke, tempoHinweis } from '../logic/diary-stats.js';
import { parseStrecke } from '../logic/diary-validation.js';

// Bleibt über Neuzeichnen hinweg erhalten.
let zustand = null;

function standardZeiten(ctx) {
  const [h0, m0] = ctx.jetzt().slice(11, 16).split(':').map(Number);
  const ende = Math.floor((h0 * 60 + m0) / 5) * 5;
  return { startMin: Math.max(0, ende - 30), endeMin: Math.max(30, ende) };
}

function leererZustand(ctx) {
  return { datum: ctx.heute(), ...standardZeiten(ctx), strecke: '', kommentar: '', bearbeiteId: null, schaetzArt: null };
}

export function tagebuchZuruecksetzen() {
  zustand = null;
}

export function tagebuchAnsicht(ctx) {
  if (!zustand) zustand = leererZustand(ctx);
  const tageMitEintrag = () => new Set(ctx.eintraege.map((e) => e.datum));

  const titelDatum = h('p', { class: 'feld-label' });
  const status = h('p', { class: 'sehr-klein nebentext', 'aria-live': 'polite' });
  const listeBox = h('section', { class: 'stapel', 'aria-label': 'Einträge' });

  const kal = kalender({
    heute: ctx.heute(), gewaehlt: zustand.datum, mitEintrag: tageMitEintrag(),
    onWahl: (d) => { zustand.datum = d; titelDatum.textContent = datumLang(d); zeichneListe(); },
  });

  const start = zeitRad({ label: 'Von', minuten: zustand.startMin, onChange: (m) => { zustand.startMin = m; zeitGeaendert(); } });
  const ende = zeitRad({ label: 'Bis', minuten: zustand.endeMin, onChange: (m) => { zustand.endeMin = m; zeitGeaendert(); } });

  // Strecke: selbst eingeben oder aus Dauer und Schwimmart schätzen lassen.
  const strecke = h('input', {
    class: 'eingabe', id: 'strecke', type: 'text', inputmode: 'decimal', autocomplete: 'off',
    placeholder: 'z. B. 1,5', value: zustand.strecke, 'aria-describedby': 'tempo-hinweis',
    oninput: () => { zustand.strecke = strecke.value; zustand.schaetzArt = null; aktualisiereStrecke(); },
  });
  const tempoZeile = h('p', { class: 'tempo-hinweis', id: 'tempo-hinweis', 'aria-live': 'polite' });
  const schaetzKnoepfe = Object.entries(TEMPO.schaetzen).map(([id, t]) => h('button', {
    class: 'schaetz-option', type: 'button', 'aria-pressed': 'false',
    onclick: () => { zustand.schaetzArt = id; schaetzen(); },
  }, h('strong', { text: t.label }), h('span', { text: t.text })));
  // Immer sichtbar: Für viele ist Schätzen der Hauptweg, nicht die Ausnahme.
  const schaetzBox = h('div', { class: 'schaetz-box', role: 'group', 'aria-labelledby': 'schaetz-titel' },
    h('span', { class: 'schaetz-titel', id: 'schaetz-titel', text: 'Strecke nicht bekannt? Schätzen nach Tempo:' }),
    h('div', { class: 'schaetz-optionen' }, schaetzKnoepfe));

  const dauer = () => zustand.endeMin - zustand.startMin;

  function schaetzen() {
    const km = schaetzeStrecke(dauer(), zustand.schaetzArt);
    if (km == null) {
      tempoZeile.textContent = 'Wähle zuerst, von wann bis wann du geschwommen bist.';
      tempoZeile.classList.remove('warnung');
      return;
    }
    zustand.strecke = String(km).replace('.', ',');
    strecke.value = zustand.strecke;
    aktualisiereStrecke();
  }

  function zeitGeaendert() {
    if (zustand.schaetzArt) schaetzen();
    else aktualisiereStrecke();
  }

  function aktualisiereStrecke() {
    schaetzKnoepfe.forEach((k, i) => k.setAttribute('aria-pressed', Object.keys(TEMPO.schaetzen)[i] === zustand.schaetzArt ? 'true' : 'false'));
    const p = parseStrecke(zustand.strecke);
    const hinweis = p.wert ? tempoHinweis(p.wert, dauer()) : null;
    tempoZeile.classList.toggle('warnung', Boolean(hinweis?.warnung));
    if (!hinweis) { tempoZeile.textContent = ''; return; }
    const basis = `≈ ${zahl(Math.round(hinweis.kmh * 10) / 10)} km/h · ${paceText(hinweis.pace)} min pro 100 m · ${hinweis.text}`;
    tempoZeile.textContent = zustand.schaetzArt
      ? `Geschätzt aus ${dauer()} min ${TEMPO.schaetzen[zustand.schaetzArt].label.toLowerCase()}. ${basis}`
      : basis;
  }

  const zaehler = h('p', { class: 'zeichen-zaehler', 'aria-live': 'polite' });
  const kommentar = h('textarea', {
    class: 'eingabe', id: 'kommentar', maxlength: String(TAGEBUCH.maxKommentar), rows: '3',
    placeholder: 'Wie war es?',
    oninput: () => { zustand.kommentar = kommentar.value; zaehle(); },
  });
  kommentar.value = zustand.kommentar;
  const zaehle = () => {
    const n = kommentar.value.length;
    zaehler.textContent = `${n} / ${TAGEBUCH.maxKommentar}`;
    zaehler.classList.toggle('voll', n >= TAGEBUCH.maxKommentar);
  };
  zaehle();

  const speicherKnopf = h('button', { class: 'knopf knopf-primaer', type: 'button', text: 'Speichern' });
  const verwerfenKnopf = h('button', { class: 'knopf knopf-text', type: 'button', text: 'Verwerfen' });

  function formularFuellen() {
    titelDatum.textContent = datumLang(zustand.datum);
    start.setze(zustand.startMin);
    ende.setze(zustand.endeMin);
    strecke.value = zustand.strecke;
    aktualisiereStrecke();
    kommentar.value = zustand.kommentar;
    zaehle();
    speicherKnopf.textContent = zustand.bearbeiteId ? 'Änderung speichern' : 'Speichern';
    kal.setze(zustand.datum, tageMitEintrag());
  }

  verwerfenKnopf.addEventListener('click', () => {
    zustand = leererZustand(ctx);
    formularFuellen();
    status.textContent = 'Formular geleert';
    zeichneListe();
  });

  speicherKnopf.addEventListener('click', async () => {
    zustand.startMin = start.wert();
    zustand.endeMin = ende.wert();
    const r = pruefeEintrag({ ...zustand, streckeText: zustand.strecke }, ctx.eintraege, zustand.bearbeiteId);
    if (!r.ok) {
      await popup({ text: r.text });
      return;
    }
    speicherKnopf.disabled = true;
    status.textContent = 'Wird gespeichert';
    const alt = ctx.eintraege.find((e) => e.id === zustand.bearbeiteId);
    const station = alt?.station || ctx.profil.station;
    const gleicheZeit = alt && alt.datum === zustand.datum && alt.startMin === zustand.startMin;
    const messwerte = gleicheZeit ? alt.messwerte : await ctx.quelle.historisch(station, lokalZuDate(zustand.datum, zustand.startMin));

    await speichereEintrag({
      id: zustand.bearbeiteId || neueId(),
      datum: zustand.datum,
      startMin: zustand.startMin,
      endeMin: zustand.endeMin,
      strecke: r.strecke,
      geschaetzt: Boolean(zustand.schaetzArt),
      schaetzArt: zustand.schaetzArt || null,
      station,
      kommentar: zustand.kommentar.trim().slice(0, TAGEBUCH.maxKommentar),
      messwerte: messwerte ? { wasser: messwerte.wasser, luft: messwerte.luft, windKmh: messwerte.windKmh, zeit: new Date(messwerte.zeit).toISOString() } : null,
      erstellt: alt?.erstellt || new Date().toISOString(),
      geaendert: new Date().toISOString(),
    });
    await ctx.ladeEintraege();
    const gespeichertesDatum = zustand.datum;
    zustand = { ...leererZustand(ctx), datum: gespeichertesDatum };
    formularFuellen();
    zeichneListe();
    speicherKnopf.disabled = false;
    status.textContent = messwerte ? 'Gespeichert, mit Messwerten' : 'Gespeichert. Für diese Zeit gab es keine Messwerte.';
  });

  function zeichneListe() {
    leeren(listeBox);
    const [j, m] = zustand.datum.split('-').map(Number);
    const praefix = zustand.datum.slice(0, 7);
    const liste = ctx.eintraege.filter((e) => e.datum.startsWith(praefix));
    listeBox.append(h('h2', { class: 'abschnitt-titel', text: `Einträge im ${monatTitel(j, m)}` }));
    if (!liste.length) {
      listeBox.append(h('p', { class: 'nebentext klein', text: 'In diesem Monat noch keine Schwümme.' }));
      return;
    }
    for (const e of liste) {
      const mw = e.messwerte;
      const tempo = e.geschaetzt ? 'Strecke geschätzt' : (ctx.profil.art === 'trainieren' ? `${paceText(paceEintrag(e))} min/100 m` : null);
      const meta = [STATIONEN[e.station]?.name, tempo, mw ? `Wasser ${zahl(mw.wasser)}°` : null, mw ? `Luft ${ganz(mw.luft)}°` : null, mw ? null : 'ohne Messwerte']
        .filter(Boolean).join(' · ');
      listeBox.append(h('article', { class: `karte karte-flach eintrag${e.id === zustand.bearbeiteId ? ' in-bearbeitung' : ''}` },
        h('div', {},
          h('p', { class: 'eintrag-titel', text: `${datumKurz(e.datum)} · ${minutenZuText(e.startMin)}–${minutenZuText(e.endeMin)} · ${e.geschaetzt ? '≈ ' : ''}${km(e.strecke)} km` }),
          h('p', { class: 'eintrag-meta', text: meta })),
        h('div', { class: 'eintrag-aktionen' },
          h('button', {
            class: 'knopf knopf-text', type: 'button', text: 'Bearbeiten', 'aria-label': `Eintrag vom ${datumLang(e.datum)} bearbeiten`,
            onclick: () => {
              zustand = { datum: e.datum, startMin: e.startMin, endeMin: e.endeMin, strecke: String(e.strecke).replace('.', ','), kommentar: e.kommentar || '', bearbeiteId: e.id, schaetzArt: e.geschaetzt ? e.schaetzArt : null };
              formularFuellen();
              zeichneListe();
              status.textContent = 'Eintrag wird bearbeitet';
              formular.scrollIntoView({ behavior: 'smooth', block: 'start' });
            },
          }),
          h('button', {
            class: 'knopf knopf-text knopf-gefahr', type: 'button', text: 'Löschen', 'aria-label': `Eintrag vom ${datumLang(e.datum)} löschen`,
            onclick: async () => {
              const ok = await bestaetigen({
                titel: 'Eintrag löschen?',
                text: `${datumLang(e.datum)}, ${minutenZuText(e.startMin)}–${minutenZuText(e.endeMin)}, ${km(e.strecke)} km. Das lässt sich nicht rückgängig machen.`,
                ja: 'Löschen', gefahr: true,
              });
              if (!ok) return;
              await loescheEintrag(e.id);
              if (zustand.bearbeiteId === e.id) zustand = { ...leererZustand(ctx), datum: zustand.datum };
              await ctx.ladeEintraege();
              formularFuellen();
              zeichneListe();
              status.textContent = 'Eintrag gelöscht';
            },
          })),
        e.kommentar ? h('p', { class: 'eintrag-kommentar', text: e.kommentar }) : null));
    }
  }

  const formular = h('section', { class: 'karte stapel', 'aria-label': 'Schwumm eintragen', tabindex: '-1' },
    titelDatum,
    h('div', { class: 'zeitwahl' }, start.el, ende.el),
    h('div', { class: 'feld' },
      h('label', { class: 'feld-label', for: 'strecke', text: 'Strecke in km' }),
      strecke,
      schaetzBox,
      tempoZeile),
    h('div', { class: 'feld' },
      h('label', { class: 'feld-label', for: 'kommentar', text: 'Kommentar (optional)' }),
      kommentar, zaehler),
    h('div', { class: 'aktionen' }, verwerfenKnopf, speicherKnopf),
    status);

  titelDatum.textContent = datumLang(zustand.datum);
  aktualisiereStrecke();
  speicherKnopf.textContent = zustand.bearbeiteId ? 'Änderung speichern' : 'Speichern';
  zeichneListe();

  // Vom Knopf "Schwumm eintragen": direkt zum Formular, heute ist schon gewählt.
  if (ctx.fokusFormular) {
    ctx.fokusFormular = false;
    setTimeout(() => {
      formular.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      formular.focus({ preventScroll: true });
    }, 50);
  }

  return [
    h('div', { class: 'ansicht-titel' },
      h('button', { class: 'knopf knopf-text', type: 'button', 'aria-label': 'Zurück zum Start', onclick: () => ctx.navigiere('#start') }, ICON.links(), 'Start'),
    ),
    h('h1', { text: 'Schwimmtagebuch' }),
    kal.el,
    formular,
    listeBox,
  ];
}
