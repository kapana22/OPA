import { Observable } from './observable';
import { getJSON, setJSON, remove } from './storage';

const MONTHS = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი',
];

/**
 * ერთი საღამოს ჟურნალი — რა ითამაშეთ და როდის დაიწყო.
 *
 * **ზღვარი.** საღამო იწყება პირველი თამაშით და მთავრდება მაშინ, როცა ქულებს
 * განულებ — ანუ იმავე ჟესტით, რომლითაც ისედაც ამბობ „ახალი საღამოა“.
 *
 * პორტი: `Splash/Core/NightLog.swift`.
 */
export class NightLog extends Observable {
  private static readonly playsKey = 'splash.night.plays.v1';
  private static readonly startKey = 'splash.night.started.v1';

  private _plays: Record<string, number> = {};
  /** როდის დაიწყო საღამო — epoch, მილიწამებში. */
  private _startedAt: number | null = null;

  constructor() {
    super();
    const plays = getJSON<Record<string, number>>(NightLog.playsKey, {});
    if (plays && typeof plays === 'object' && !Array.isArray(plays)) {
      for (const [k, v] of Object.entries(plays)) if (typeof v === 'number') this._plays[k] = v;
    }
    const started = getJSON<number | null>(NightLog.startKey, null);
    this._startedAt = typeof started === 'number' ? started : null;
  }

  get plays(): Readonly<Record<string, number>> {
    return this._plays;
  }
  get startedAt(): Date | null {
    return this._startedAt === null ? null : new Date(this._startedAt);
  }

  /** სულ რამდენი პარტია გავიდა. */
  get totalGames(): number {
    return Object.values(this._plays).reduce((a, b) => a + b, 0);
  }

  /** რომელი თამაშები ითამაშეს — ხშირობის მიხედვით. */
  get playedIDs(): string[] {
    return Object.entries(this._plays)
      .sort((a, b) => (a[1] !== b[1] ? b[1] - a[1] : a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([id]) => id);
  }

  /** ყველაზე ხშირად ნათამაშები — „საღამოს თამაში“. */
  get favouriteID(): string | null {
    const values = Object.values(this._plays);
    if (values.length === 0) return null;
    const best = Math.max(...values);
    if (best <= 0) return null;
    return Object.keys(this._plays).filter((k) => this._plays[k] === best).sort()[0] ?? null;
  }

  /** თამაში გაიხსნა. */
  record(id: string): void {
    if (this._startedAt === null) {
      this._startedAt = Date.now();
      setJSON(NightLog.startKey, this._startedAt);
    }
    this._plays[id] = (this._plays[id] ?? 0) + 1;
    setJSON(NightLog.playsKey, this._plays);
    this.notify();
  }

  /** ახალი საღამო. */
  reset(): void {
    this._plays = {};
    this._startedAt = null;
    remove(NightLog.playsKey);
    remove(NightLog.startKey);
    this.notify();
  }

  /** თარიღი ბარათისთვის — ქართულად, წლის გარეშე თუ წელს ემთხვევა. */
  dateLabel(now: Date = new Date()): string {
    return NightLog.label(this.startedAt ?? now, now);
  }

  /**
   * ცალკე გატანილია, რომ ტესტმა ფიქსირებული თარიღი გადასცეს.
   *
   * `Intl`-ს განზრახ არ ვიყენებთ: სისტემის ქართული ფორმატი მოწყობილობის ენაზეა
   * დამოკიდებული, ბარათი კი ყოველთვის ქართულია.
   */
  static label(date: Date, now: Date = new Date()): string {
    const day = date.getDate();
    const name = MONTHS[Math.min(Math.max(date.getMonth(), 0), 11)];
    return date.getFullYear() === now.getFullYear() ? `${day} ${name}` : `${day} ${name}, ${date.getFullYear()}`;
  }
}
