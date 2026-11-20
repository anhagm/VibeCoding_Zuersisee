// Intro beim ersten Start: Über der Oberfläche erscheint der Name, dann taucht die Ansicht ab.
// 2,5 Sekunden, nur einmal. Bei "Bewegung reduzieren" wird es gar nicht gezeigt.

const welle = (fuellung) => `<svg viewBox="0 0 720 50" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 25 C60 10 120 10 180 25 C240 40 300 40 360 25 C420 10 480 10 540 25 C600 40 660 40 720 25 V50 H0 Z" fill="${fuellung}"/></svg>`;

export function zeigeIntro() {
  const el = document.createElement('div');
  el.className = 'intro';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="intro-tauchen">
      <div class="intro-himmel"></div>
      <div class="intro-wasser"></div>
      <div class="intro-oberflaeche">${welle('#CDEBE6')}${welle('#CDEBE6')}</div>
      <i></i><i></i><i></i><i></i><i></i>
    </div>
    <div class="intro-marke"><strong>Seeampel</strong><span>Lohnt sich ein Schwumm – für dich?</span></div>`;
  document.body.append(el);
  setTimeout(() => el.remove(), 2900);
  return el;
}
