// Schwimmtagebuch in IndexedDB.

const STORE = 'eintraege';
let name = 'seeampel';
let dbPromise = null;

export function nutzeDatenbank(dbName) {
  name = dbName;
  dbPromise = null;
}

function oeffnen() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'id' });
        s.createIndex('datum', 'datum');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(modus, fn) {
  const db = await oeffnen();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, modus);
    const s = t.objectStore(STORE);
    let ergebnis;
    Promise.resolve(fn(s)).then((r) => { ergebnis = r; });
    t.oncomplete = () => resolve(ergebnis);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const anfrage = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const sortiere = (a, b) => (b.datum.localeCompare(a.datum) || b.startMin - a.startMin);

export async function alleEintraege() {
  const liste = await tx('readonly', (s) => anfrage(s.getAll()));
  return (liste || []).sort(sortiere);
}

export function speichereEintrag(eintrag) {
  return tx('readwrite', (s) => { s.put(eintrag); });
}

export function speichereViele(eintraege) {
  return tx('readwrite', (s) => { eintraege.forEach((e) => s.put(e)); });
}

export function loescheEintrag(id) {
  return tx('readwrite', (s) => { s.delete(id); });
}

export function leeren() {
  return tx('readwrite', (s) => { s.clear(); });
}

export function neueId() {
  return (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
