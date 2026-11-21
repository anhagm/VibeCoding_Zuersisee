// Wellenring beim Antippen, nur auf Touch-Geräten: Rückmeldung, dass der Tipp angekommen ist,
// wie ein Tropfen auf der Wasseroberfläche. Am Desktop gibt es stattdessen das Fischlein.

export function starteWellenring() {
  const touch = window.matchMedia('(hover: none) and (pointer: coarse)');
  const reduziert = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!touch.matches || reduziert.matches) return;

  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    const ring = document.createElement('span');
    ring.className = 'wellenring';
    ring.setAttribute('aria-hidden', 'true');
    ring.style.left = `${e.clientX}px`;
    ring.style.top = `${e.clientY}px`;
    document.body.append(ring);
    ring.addEventListener('animationend', () => ring.remove(), { once: true });
    setTimeout(() => ring.remove(), 1000);
  }, { passive: true });
}
