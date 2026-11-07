// Pop-up: 85 % deckend mit Unschärfe, Seite abgedunkelt.
// Schliessen über den Knopf, Tippen daneben oder Escape. Eingaben bleiben erhalten.

import { h } from '../util/dom.js';

export function popup({ titel = null, text, knoepfe = [{ label: 'Korrigieren', primaer: true, wert: null }] }) {
  return new Promise((resolve) => {
    const vorher = document.activeElement;
    const id = `p${Math.random().toString(36).slice(2, 8)}`;

    const schliessen = (wert) => {
      document.removeEventListener('keydown', taste, true);
      schicht.remove();
      if (vorher && vorher.focus) vorher.focus({ preventScroll: true });
      resolve(wert);
    };
    const taste = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); schliessen(null); }
      if (e.key === 'Tab') {
        const fokusierbar = [...box.querySelectorAll('button')];
        const i = fokusierbar.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); fokusierbar.at(-1).focus(); }
        else if (!e.shiftKey && i === fokusierbar.length - 1) { e.preventDefault(); fokusierbar[0].focus(); }
      }
    };

    const box = h('div', { class: 'popup', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': titel ? `${id}-t` : null, 'aria-describedby': `${id}-d` },
      titel ? h('h2', { id: `${id}-t`, text: titel }) : null,
      h('p', { class: 'popup-text', id: `${id}-d`, text }),
      h('div', { class: 'popup-aktionen' },
        knoepfe.map((k) => h('button', {
          class: `knopf ${k.primaer ? 'knopf-primaer' : 'knopf-text'} ${k.gefahr ? 'knopf-gefahr' : ''}`,
          type: 'button', text: k.label, onclick: () => schliessen(k.wert),
        }))));

    const schicht = h('div', { class: 'popup-schicht', onclick: (e) => { if (e.target === schicht) schliessen(null); } }, box);
    document.body.append(schicht);
    document.addEventListener('keydown', taste, true);
    (box.querySelector('.knopf-primaer') || box.querySelector('button')).focus();
  });
}

export function bestaetigen({ titel, text, ja, nein = 'Abbrechen', gefahr = false }) {
  return popup({ titel, text, knoepfe: [{ label: nein, wert: false }, { label: ja, primaer: !gefahr, gefahr, wert: true }] })
    .then((w) => w === true);
}
