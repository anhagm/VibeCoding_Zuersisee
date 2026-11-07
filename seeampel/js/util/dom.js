// Kleine DOM-Helfer und Icons. Icons stehen immer vor einem Wert oder Text, nie allein.

export function h(tag, props = {}, ...kinder) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kind of kinder.flat()) {
    if (kind === null || kind === undefined || kind === false) continue;
    el.append(kind instanceof Node ? kind : document.createTextNode(String(kind)));
  }
  return el;
}

export function svg(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

const strich = (d, extra = '') =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

export const ICON = {
  wellen: () => svg(strich('<path d="M2 9c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/><path d="M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/>')),
  thermometer: () => svg(strich('<path d="M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0z"/>')),
  wind: () => svg(strich('<path d="M3 8h10a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h6"/>')),
  blitz: () => svg(strich('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>')),
  uhr: () => svg(strich('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')),
  ort: () => svg(strich('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>')),
  tasche: () => svg(strich('<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>')),
  warn: () => svg(strich('<path d="M12 3 2 20h20z"/><path d="M12 10v4"/><path d="M12 17h.01"/>', 'class="warnsymbol"')),
  offline: () => svg(strich('<path d="M3 3l18 18"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 5.2-2.7"/><path d="M19 12.9a10 10 0 0 0-2.3-1.6"/><path d="M12 20h.01"/>')),
  links: () => svg(strich('<path d="M15 6l-6 6 6 6"/>')),
  rechts: () => svg(strich('<path d="M9 6l6 6-6 6"/>')),
};

const STERN_PFAD = 'M12 2.6l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z';

// Sterne mit halben Werten. Für Screenreader steht die Zahl im Label.
export function sterne(anzahl, { klein = false } = {}) {
  const box = h('div', { class: `sterne${klein ? ' sterne-klein' : ''}`, role: 'img', 'aria-label': `${String(anzahl).replace('.', ',')} von 5 Sternen` });
  for (let i = 1; i <= 5; i++) {
    const anteil = Math.max(0, Math.min(1, anzahl - (i - 1)));
    const id = `s${Math.random().toString(36).slice(2, 9)}`;
    box.append(svg(`<svg viewBox="0 0 24 24" aria-hidden="true">
      <defs><clipPath id="${id}"><rect x="0" y="0" width="${24 * anteil}" height="24"/></clipPath></defs>
      <path class="stern-leer" d="${STERN_PFAD}"/>
      <path class="stern-voll" d="${STERN_PFAD}" clip-path="url(#${id})"/>
    </svg>`));
  }
  return box;
}

export function leeren(el) {
  while (el.firstChild) el.firstChild.remove();
  return el;
}
