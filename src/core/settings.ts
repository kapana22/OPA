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

/**
 * მონიშნული კატეგორიები შენახულიდან. `[]` — ყველა კატეგორია.
 *
 * ძველ ვერსიას ერთი `categoryID` ეწერა — ის `[id]`-ად გადმოდის. ბანკიდან
 * წაშლილი და გამეორებული id-ები ცვივა.
 */
export function categoryIDs(stored: object, exists: (id: string) => boolean): string[] {
  const s = stored as { categoryIDs?: unknown; categoryID?: unknown };
  const raw: unknown[] = Array.isArray(s.categoryIDs) ? s.categoryIDs : typeof s.categoryID === 'string' ? [s.categoryID] : [];
  return cleanCategoryIDs(raw, exists);
}

/** სუფთა სია — მხოლოდ არსებული, უნიკალური სტრიქონები. */
export function cleanCategoryIDs(ids: readonly unknown[], exists: (id: string) => boolean): string[] {
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id === 'string' && !out.includes(id) && exists(id)) out.push(id);
  }
  return out;
}

/**
 * დასტის გასაღების ბოლო ნაწილი მონიშვნისთვის — რიგისგან დამოუკიდებელი:
 * `[]` → `all`, `['b','a']` → `a+b`. ერთი კატეგორია ძველ გასაღებს (`<id>`) ინარჩუნებს.
 */
export function selectionKey(ids: readonly string[], all = 'all'): string {
  return ids.length === 0 ? all : [...ids].sort().join('+');
}

/** განხილვის ტაიმერის არჩევანი (წამი); `0` — ტაიმერის გარეშე („∞“). */
export const DISCUSSION_OPTIONS = [0, 60, 120, 180, 300] as const;

/** განხილვის დრო შენახულიდან: `0` (გამორთული) ან 30…600 წამი. */
export function discussionSeconds(value: unknown, fallback = 0): number {
  if (value === 0) return 0;
  return num(value, fallback, 30, 600);
}

/** ჩიპის წარწერა: `∞` ან `2:00`. */
export function discussionLabel(seconds: number): string {
  return seconds === 0 ? '∞' : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
