import { Observable } from './observable';
import { uuid } from './id';
import { getJSON, setJSON } from './storage';

export interface Player {
  id: string;
  name: string;
  score: number;
}

/** მაქსიმალური შემადგენლობა — Swift-ის `players.count < 12`. */
export const MAX_PLAYERS = 12;

/**
 * მოთამაშეების საერთო სია — ყველა თამაში ერთსა და იმავე როსტერს იყენებს,
 * ამიტომ სახელები ერთხელ შეგყავს და აღარ იმეორებ.
 *
 * პორტი: `Splash/Core/Roster.swift`.
 */
export class Roster extends Observable {
  private _players: Player[] = [];
  private static readonly storageKey = 'splash.roster.v1';

  constructor() {
    super();
    this.load();
  }

  get players(): readonly Player[] {
    return this._players;
  }
  get count(): number {
    return this._players.length;
  }
  get names(): string[] {
    return this._players.map((p) => p.name);
  }

  add(name: string): void {
    const trimmed = name.trim();
    if (!trimmed || this._players.length >= MAX_PLAYERS) return;
    // რეგისტრის მიუხედავად დუბლიკატი არ ჩაემატება (Swift: caseInsensitiveCompare).
    if (this._players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return;
    this._players.push({ id: uuid(), name: trimmed, score: 0 });
    this.save();
  }

  removeAt(index: number): void {
    if (index < 0 || index >= this._players.length) return;
    this._players.splice(index, 1);
    this.save();
  }

  remove(id: string): void {
    this._players = this._players.filter((p) => p.id !== id);
    this.save();
  }

  rename(id: string, newName: string): void {
    const p = this._players.find((x) => x.id === id);
    if (!p) return;
    const trimmed = newName.trim();
    if (!trimmed) return;
    p.name = trimmed;
    this.save();
  }

  addScore(points: number, id: string): void {
    const p = this._players.find((x) => x.id === id);
    if (!p) return;
    p.score += points;
    this.save();
  }

  resetScores(): void {
    for (const p of this._players) p.score = 0;
    this.save();
  }

  /**
   * რიგის შეცვლა გადათრევით.
   *
   * რიგი აპში მნიშვნელოვანია და არა დეკორატიული: შარადებში, ალიასში,
   * „ვინ ვარ მე?“-სა და მაგიდის კითხვის რეჟიმებში ჯერი სწორედ ამ თანმიმდევრობით
   * ტრიალებს. სია სუფრის რიგს უნდა ემთხვეოდეს.
   */
  move(from: number, to: number): void {
    if (from < 0 || from >= this._players.length) return;
    const clamped = Math.max(0, Math.min(to, this._players.length - 1));
    const [moved] = this._players.splice(from, 1);
    this._players.splice(clamped, 0, moved);
    this.save();
  }

  /** რიგის შემთხვევით არევა — როცა კომპანია ვერ თანხმდება, ვინ დაიწყოს. */
  shuffleOrder(): void {
    if (this._players.length <= 1) return;
    const before = this._players.map((p) => p.id).join(',');
    // Swift: `repeat { shuffle() } while order == before` — არევამ რიგი უნდა შეცვალოს.
    do {
      for (let i = this._players.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this._players[i], this._players[j]] = [this._players[j], this._players[i]];
      }
    } while (this._players.map((p) => p.id).join(',') === before);
    this.save();
  }

  get leaderboard(): Player[] {
    return [...this._players].sort((a, b) => (a.score !== b.score ? b.score - a.score : a.name.localeCompare(b.name, 'ka')));
  }

  // MARK: - შენახვა

  private save(): void {
    setJSON(Roster.storageKey, this._players);
    this.notify();
  }

  private load(): void {
    const stored = getJSON<Player[]>(Roster.storageKey, []);
    if (!Array.isArray(stored)) return;
    this._players = stored.filter(
      (p): p is Player => !!p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.score === 'number',
    );
  }
}
