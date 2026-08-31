import { Observable } from './observable';
import { getJSON, setJSON, remove } from './storage';

/**
 * ბოლოს ნათამაშები — მთავარი ეკრანის ზედა რიგი.
 *
 * **რატომ.** კომპანია ცხრამეტ თამაშს არ თამაშობს — სამს თამაშობს. ბადეში
 * ცხრამეტი ფილაა და ღამის ერთზე მათ შორის არჩევა თვითონ თამაშზე დიდხანს
 * გრძელდება.
 *
 * პორტი: `Splash/Core/RecentGames.swift` (+ `RecentGames+Catalog.swift`).
 */
export class RecentGames extends Observable {
  /** რამდენი ჩანს ზედა რიგში — სამი განზრახაა, მეტი ისევ სიად იქცევა. */
  static readonly visibleLimit = 3;
  /** რამდენს ვიმახსოვრებთ სულ — ერთმა შემთხვევითმა გახსნამ ჩვეული თამაში არ უნდა ამოაგდოს. */
  private static readonly storeLimit = 8;
  private static readonly key = 'splash.recentGames.v1';

  private _ids: string[] = [];

  constructor() {
    super();
    const stored = getJSON<string[]>(RecentGames.key, []);
    this._ids = Array.isArray(stored) ? stored.filter((x): x is string => typeof x === 'string') : [];
  }

  get ids(): readonly string[] {
    return this._ids;
  }

  /** თამაში გაიხსნა — რიგის თავში გადადის. */
  record(id: string): void {
    this._ids = [id, ...this._ids.filter((x) => x !== id)].slice(0, RecentGames.storeLimit);
    setJSON(RecentGames.key, this._ids);
    this.notify();
  }

  /**
   * ზედა რიგის იდენტიფიკატორები — მხოლოდ ის, რაც კატალოგში ისევ არსებობს.
   * კატალოგიდან წაშლილი თამაში სიაში რჩება, მაგრამ ეკრანზე არ უნდა გამოვიდეს.
   */
  visibleIDs(available: readonly string[]): string[] {
    const known = new Set(available);
    return this._ids.filter((id) => known.has(id)).slice(0, RecentGames.visibleLimit);
  }

  clear(): void {
    this._ids = [];
    remove(RecentGames.key);
    this.notify();
  }
}
