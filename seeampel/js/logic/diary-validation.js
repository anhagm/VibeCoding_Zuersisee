// Plausibilitätsprüfung für Tagebucheinträge. Gibt {ok, strecke} oder {ok: false, text} zurück.

import { TAGEBUCH } from '../config.js';
import { minutenZuText, dauerText } from '../util/zeit.js';
import { km, zahl } from '../util/format.js';

export function parseStrecke(text) {
  const t = String(text ?? '').trim().replace(',', '.');
  if (t === '') return { leer: true };
  if (!/^\d+(\.\d+)?$/.test(t) && !/^\.\d+$/.test(t)) return { ungueltig: true };
  return { wert: Number(t) };
}

export function ueberschneidet(a, b) {
  return a.datum === b.datum && a.startMin < b.endeMin && b.startMin < a.endeMin;
}

export function pruefeEintrag({ datum, startMin, endeMin, streckeText }, bestehende = [], eigeneId = null) {
  if (endeMin < startMin) {
    return { ok: false, text: `Das Ende (${minutenZuText(endeMin)}) liegt vor dem Start (${minutenZuText(startMin)}). Prüf die Uhrzeiten.` };
  }
  if (endeMin === startMin) {
    return { ok: false, text: `Start und Ende sind beide ${minutenZuText(startMin)} – so warst du 0 Minuten im Wasser.` };
  }
  const dauer = endeMin - startMin;
  if (dauer > TAGEBUCH.maxStunden * 60) {
    return { ok: false, text: `${dauerText(dauer)} am Stück sind mehr als ${TAGEBUCH.maxStunden} Stunden – das ist kein Schwumm mehr. Prüf die Uhrzeiten.` };
  }

  const s = parseStrecke(streckeText);
  if (s.leer) return { ok: false, text: 'Ohne Strecke lässt sich der Schwumm nicht eintragen. Gib die Kilometer ein.' };
  if (s.ungueltig) return { ok: false, text: `«${String(streckeText).trim()}» ist keine Strecke. Gib die Kilometer als Zahl ein, zum Beispiel 1,5.` };
  if (s.wert === 0) return { ok: false, text: '0 km wären kein Schwumm. Gib die geschwommene Strecke ein.' };

  const tempo = s.wert / (dauer / 60);
  if (tempo > TAGEBUCH.maxTempoKmh) {
    return { ok: false, text: `${km(s.wert)} km in ${dauerText(dauer)} wären ${zahl(Math.round(tempo * 10) / 10)} km/h – schneller als Weltrekordtempo. Prüf Strecke oder Zeit.` };
  }

  const konflikt = bestehende.find((e) => e.id !== eigeneId && ueberschneidet({ datum, startMin, endeMin }, e));
  if (konflikt) {
    return { ok: false, text: `Von ${minutenZuText(konflikt.startMin)} bis ${minutenZuText(konflikt.endeMin)} ist schon ein Schwumm eingetragen. Zwei Schwümme gleichzeitig gehen nicht.` };
  }
  return { ok: true, strecke: s.wert };
}
