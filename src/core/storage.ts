/**
 * სინქრონული გასაღები-მნიშვნელობის საცავი, ასინქრონული შენახვით უკან.
 *
 * **რატომ არსებობს.** Swift-ის მხარეს `UserDefaults` სინქრონულია: `ContentShoe`
 * ინიციალიზაციისას კითხულობს და ყოველ დარიგებაზე წერს, ყოველგვარი `await`-ის
 * გარეშე. RN-ის `AsyncStorage` ასინქრონულია — თუ ამას ძრავებში გავუშვებთ,
 * ყველა ძრავს `async` სჭირდება და პორტი წყდება.
 *
 * ამიტომ: მთელი `splash.*` სივრცე ერთხელ იტვირთება მეხსიერებაში აპის
 * გაშვებისას (`hydrate`), შემდეგ კითხვა-წერა **სინქრონულია**, ხოლო დისკზე
 * ჩაწერა ფონურად ხდება. ძრავები `UserDefaults`-ის იმავე ფორმას ხედავენ.
 *
 * ტესტებში backend საერთოდ არ ირთვება — სუფთა მეხსიერებაა, ნატიური მოდული
 * არ შემოდის. სწორედ ამიტომ იტესტება `ContentShoe` ტელეფონის გარეშე.
 */

export interface StorageBackend {
  /** ყველა `splash.*` წყვილის წაკითხვა გაშვებისას. */
  load(): Promise<Record<string, string>>;
  /** ჩაწერა — შედეგს არავინ ელოდება. */
  persist(key: string, value: string): void;
  /** წაშლა — შედეგს არავინ ელოდება. */
  remove(key: string): void;
}

const memory = new Map<string, string>();
let backend: StorageBackend | null = null;

/** backend-ის მიბმა და დისკიდან ჩატვირთვა. აპის გაშვებისას ერთხელ. */
export async function hydrate(next: StorageBackend): Promise<void> {
  backend = next;
  const stored = await next.load();
  for (const [k, v] of Object.entries(stored)) memory.set(k, v);
}

export function getString(key: string): string | null {
  return memory.get(key) ?? null;
}

export function setString(key: string, value: string): void {
  memory.set(key, value);
  backend?.persist(key, value);
}

export function getJSON<T>(key: string, fallback: T): T {
  const raw = memory.get(key);
  if (raw === undefined) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // დაზიანებული ჩანაწერი ჩავარდნას არ უნდა იწვევდეს — უბრალოდ არ არსებობს.
    return fallback;
  }
}

export function setJSON(key: string, value: unknown): void {
  setString(key, JSON.stringify(value));
}

export function remove(key: string): void {
  memory.delete(key);
  backend?.remove(key);
}

/** პრეფიქსით წაშლა — „კონტენტის განულება“ პარამეტრებში. */
export function removeByPrefix(prefix: string): void {
  for (const key of [...memory.keys()]) {
    if (key.startsWith(prefix)) remove(key);
  }
}

/** მხოლოდ ტესტებისთვის — მდგომარეობის სრული განულება. */
export function __resetForTests(): void {
  memory.clear();
  backend = null;
}
