/** Finds data saved by the old browser-only version so it can be moved into the account. */
const KEY = 'fitstack:data';
const DISMISSED = 'fitstack:legacy-dismissed';

export function legacyData(): Record<string, unknown> | null {
  try {
    if (localStorage.getItem(DISMISSED)) return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    const has = (k: string) => Array.isArray(d?.[k]) && d[k].length > 0;
    return has('supplements') || has('meals') || has('doseLogs') ? d : null;
  } catch {
    return null;
  }
}

export function legacyPhotos(): Promise<{ id: string; dataUrl: string }[]> {
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open('fitstack');
    } catch {
      return resolve([]);
    }
    req.onupgradeneeded = () => req.transaction?.abort(); // database didn't exist
    req.onerror = () => resolve([]);
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('photos')) {
        db.close();
        return resolve([]);
      }
      const all = db.transaction('photos', 'readonly').objectStore('photos').getAll();
      all.onsuccess = () => {
        resolve((all.result as { id: string; dataUrl: string }[]).map(({ id, dataUrl }) => ({ id, dataUrl })));
        db.close();
      };
      all.onerror = () => resolve([]);
    };
  });
}

export function clearLegacy() {
  try {
    localStorage.removeItem(KEY);
    indexedDB.deleteDatabase('fitstack');
  } catch {
    /* ignore */
  }
}

export const dismissLegacy = () => localStorage.setItem(DISMISSED, '1');
