// Monatskalender, Woche ab Montag. Zukunft nicht wählbar, Tage mit Einträgen markiert.

import { h, ICON, leeren } from '../util/dom.js';
import { monatTitel, datumLang } from '../util/format.js';
import { wochentag } from '../util/zeit.js';

const WT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const zwei = (n) => String(n).padStart(2, '0');

export function kalender({ heute, gewaehlt, mitEintrag, onWahl }) {
  let [jahr, monat] = gewaehlt.split('-').map(Number);
  const [hj, hm] = heute.split('-').map(Number);
  const box = h('section', { class: 'karte', 'aria-label': 'Datum wählen' });

  const render = () => {
    leeren(box);
    const istAktuell = jahr === hj && monat === hm;
    const vor = h('button', { class: 'knopf knopf-text', type: 'button', 'aria-label': 'Vorheriger Monat', onclick: () => { monat--; if (monat < 1) { monat = 12; jahr--; } render(); } }, ICON.links());
    const nach = h('button', { class: 'knopf knopf-text', type: 'button', 'aria-label': 'Nächster Monat', disabled: istAktuell, onclick: () => { monat++; if (monat > 12) { monat = 1; jahr++; } render(); } }, ICON.rechts());

    const raster = h('div', { class: 'kalender-raster' }, WT.map((w) => h('div', { class: 'kalender-wt', 'aria-hidden': 'true', text: w })));
    const erster = `${jahr}-${zwei(monat)}-01`;
    for (let i = 0; i < wochentag(erster); i++) raster.append(h('div'));
    const tage = new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
    for (let d = 1; d <= tage; d++) {
      const datum = `${jahr}-${zwei(monat)}-${zwei(d)}`;
      const zukunft = datum > heute;
      const klassen = ['tag', datum === heute && 'heute', datum === gewaehlt && 'gewaehlt', mitEintrag.has(datum) && 'hat-eintrag'].filter(Boolean).join(' ');
      raster.append(h('button', {
        class: klassen, type: 'button', disabled: zukunft, text: String(d),
        'aria-label': `${datumLang(datum)}${mitEintrag.has(datum) ? ', mit Eintrag' : ''}`,
        'aria-pressed': datum === gewaehlt ? 'true' : 'false',
        onclick: () => { gewaehlt = datum; onWahl(datum); render(); },
      }));
    }
    box.append(h('div', { class: 'kalender-kopf' }, vor, h('span', { class: 'kalender-titel', 'aria-live': 'polite', text: monatTitel(jahr, monat) }), nach), raster);
  };

  render();
  return {
    el: box,
    setze(datum, eintraege) {
      gewaehlt = datum;
      [jahr, monat] = datum.split('-').map(Number);
      if (eintraege) mitEintrag = eintraege;
      render();
    },
    monat: () => ({ jahr, monat }),
  };
}
