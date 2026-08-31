import { getJSON, setJSON } from './storage';

/**
 * ძრავის პარამეტრების შენახვა.
 *
 * Swift-ში ეს `var settings = Settings() { didSet { saveSettings() } }` იყო —
 * ყოველი მინიჭება თავისით ინახებოდა. TypeScript-ს თვისების დამკვირვებელი არ
 * აქვს, ამიტომ ერთი დამხმარე: ჩატვირთვა გასუფთავებით და ცხადი შენახვა.
 *
 * `sanitize` აუცილებელია — შენახული JSON შეიძლება ძველი ვერსიისა იყოს, ან
 * კატეგორია უკვე აღარ არსებობდეს.
 */
export function loadSettings<T>(key: string, defaults: T, sanitize: (stored: Partial<T>) => T): T {
  const stored = getJSON<Partial<T>>(key, {} as Partial<T>);
  try {
    return sanitize(stored && typeof stored === 'object' ? stored : ({} as Partial<T>));
  } catch {
    return { ...defaults };
  }
}

export function saveSettings<T>(key: string, value: T): void {
  setJSON(key, value);
}

/** რიცხვი შენახულიდან, ზღვრებით. */
export function num(value: unknown, fallback: number, lo: number, hi: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(Math.max(lo, value), hi) : fallback;
}

/** ლოგიკური მნიშვნელობა შენახულიდან. */
export function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** ერთ-ერთი დასაშვები მნიშვნელობა. */
export function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** კატეგორიის იდენტიფიკატორი — თუ ბანკში აღარ არსებობს, `null`. */
export function categoryID(value: unknown, exists: (id: string) => boolean): string | null {
  return typeof value === 'string' && exists(value) ? value : null;
}
