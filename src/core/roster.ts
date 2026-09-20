import { availableCharacter, isCharacterID, guessGender, characterGender, BOY_CHARACTERS, GIRL_CHARACTERS, type PlayerGender } from './characters';
import { Observable } from './observable';
import { uuid } from './id';
import { getJSON, setJSON } from './storage';

export interface Player {
  id: string;
  name: string;
  score: number;
  gender?: PlayerGender;
  mascotID?: number;
  characterID?: number;
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

  add(name: string, gender?: PlayerGender): void {
    const trimmed = name.trim();
    if (!trimmed || this._players.length >= MAX_PLAYERS) return;
    // რეგისტრის მიუხედავად დუბლიკატი არ ჩაემატება (Swift: caseInsensitiveCompare).
    if (this._players.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return;
    const resolvedGender = gender ?? guessGender(trimmed);
    const used = new Set(this._players.map(p => p.characterID!).filter(isCharacterID));
    this._players.push({
      id: uuid(),
      name: trimmed,
      score: 0,
      gender: resolvedGender,
      characterID: availableCharacter(used, resolvedGender),
    });
    this.save();
  }

  setGender(id: string, gender: PlayerGender): void {
    const p = this._players.find((x) => x.id === id);
    if (!p) return;
    p.gender = gender;
    const pool = gender === 'girl' ? GIRL_CHARACTERS : BOY_CHARACTERS;
    if (p.characterID === undefined || !pool.includes(p.characterID)) {
      const used = new Set(this._players.filter(x => x.id !== id).map(x => x.characterID!).filter(isCharacterID));
      p.characterID = availableCharacter(used, gender);
    }
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
    if (!trimmed || trimmed === p.name) return;
    p.name = trimmed;
    this.save();
  }

  /** Choosing an occupied character swaps the two assignments, never duplicates. */
  setCharacter(id: string, characterID: number): void {
    const player = this._players.find(p => p.id === id);
    if (!player || !isCharacterID(characterID) || player.characterID === characterID) return;
    const other = this._players.find(p => p.characterID === characterID);
    if (other) {
      other.characterID = player.characterID;
      if (typeof other.characterID === 'number') {
        other.gender = characterGender(other.characterID);
      }
    }
    player.characterID = characterID;
    player.gender = characterGender(characterID);
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
    ).slice(0, MAX_PLAYERS);
    const used = new Set<number>();
    let migrated = false;
    for (const player of this._players) {
      if (!isCharacterID(player.characterID) || used.has(player.characterID)) {
        player.characterID = undefined;
        migrated = true;
      } else used.add(player.characterID);
    }
    for (const player of this._players) {
      if (!player.gender) {
        player.gender = guessGender(player.name);
        migrated = true;
      }
      if (player.characterID === undefined) {
        player.characterID = availableCharacter(used, player.gender);
        used.add(player.characterID);
        migrated = true;
      }
    }
    if (migrated) this.save();
  }
}
