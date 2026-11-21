// Scroll-Rad mit Stunden und Minuten in 5er-Schritten. Keine Texteingabe.

import { h } from '../util/dom.js';

const ZEILE = 44;
const zwei = (n) => String(n).padStart(2, '0');

function spalte({ werte, label, onChange }) {
  let index = 0;
  const el = h('div', { class: 'rad-spalte', role: 'listbox', tabindex: '0', 'aria-label': label });
  const items = werte.map((w, i) => h('div', { class: 'rad-wert', role: 'option', 'aria-selected': 'false', text: zwei(w), onclick: () => setze(i, true) }));
  el.append(...items);

  const markiere = () => {
    items.forEach((it, i) => {
      it.classList.toggle('aktiv', i === index);
      it.setAttribute('aria-selected', i === index ? 'true' : 'false');
    });
  };

  function setze(i, sanft = false) {
    index = Math.max(0, Math.min(werte.length - 1, i));
    el.scrollTo({ top: index * ZEILE, behavior: sanft ? 'smooth' : 'instant' });
    markiere();
    onChange();
  }

  let timer = null;
  el.addEventListener('scroll', () => {
    const i = Math.max(0, Math.min(werte.length - 1, Math.round(el.scrollTop / ZEILE)));
    if (i !== index) { index = i; markiere(); }
    clearTimeout(timer);
    timer = setTimeout(onChange, 90);
  }, { passive: true });

  el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setze(index + 1, true); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setze(index - 1, true); }
    if (e.key === 'Home') { e.preventDefault(); setze(0, true); }
    if (e.key === 'End') { e.preventDefault(); setze(werte.length - 1, true); }
  });

  markiere();
  return { el, setze, index: () => index, ausrichten: () => el.scrollTo({ top: index * ZEILE, behavior: 'instant' }) };
}

// minuten: Minuten seit Mitternacht, auf 5 gerundet.
export function zeitRad({ label, minuten, onChange = () => {} }) {
  const stunden = Array.from({ length: 24 }, (_, i) => i);
  const minutenWerte = Array.from({ length: 12 }, (_, i) => i * 5);
  const melden = () => onChange(wert());
  const hs = spalte({ werte: stunden, label: `${label}, Stunde`, onChange: melden });
  const ms = spalte({ werte: minutenWerte, label: `${label}, Minute`, onChange: melden });

  const wert = () => hs.index() * 60 + ms.index() * 5;
  const setze = (min) => {
    const m = Math.round(min / 5) * 5;
    hs.setze(Math.floor(m / 60) % 24);
    ms.setze((m % 60) / 5);
  };

  const el = h('div', { class: 'rad-gruppe' },
    h('span', { class: 'feld-label', text: label }),
    h('div', { class: 'rad' }, hs.el, h('span', { class: 'rad-trenner', 'aria-hidden': 'true', text: ':' }), ms.el));

  // Nach dem Einhängen ins DOM die Scroll-Position setzen.
  requestAnimationFrame(() => setze(minuten));
  return { el, wert, setze, ausrichten: () => { hs.ausrichten(); ms.ausrichten(); } };
}
