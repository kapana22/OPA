import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { getJSON, setJSON } from '../../core/storage';
import { PromptBank } from '../../content/banks';
import type { Player } from '../../core/roster';

/**
 * „ვინ არის ყველაზე...“ — ეკრანზე კითხვაა, ჯგუფი კი ირჩევს, ვის ერგება.
 *
 * ორი რეჟიმი:
 * - **სწრაფი** — ყველა ერთად უთითებს, ერთი შეხება და გადავდივართ.
 * - **ფარული** — ტელეფონი წრეზე გადადის, თითოეული ფარულად აძლევს ხმას.
 *
 * პორტი: `Splash/Games/MostLikely/MostLikelyEngine.swift`.
 */

export type MostLikelyPhase = 'setup' | 'prompt' | 'voting' | 'result' | 'summary';
export type MostLikelyMode = 'quick' | 'secret';

export interface MostLikelySettings {
  mode: MostLikelyMode;
  rounds: number;
  categoryID: string | null;
}

const SETTINGS_KEY = 'splash.mostlikely.settings.v1';
const DEFAULTS: MostLikelySettings = { mode: 'quick', rounds: 10, categoryID: null };

export class MostLikelyEngine extends Observable {
  readonly players: Player[];
  settings: MostLikelySettings = { ...DEFAULTS };

  phase: MostLikelyPhase = 'setup';
  round = 1;
  currentPrompt = '';

  /** ვინ ვის მისცა ხმა (ფარულ რეჟიმში). */
  votes: Record<string, string> = {};
  voterIndex = 0;
  /** ვინ რამდენი ხმა აიღო მიმდინარე რაუნდში. */
  tally: Record<string, number> = {};
  /** რაუნდის გამარჯვებული(ები) — ფრეც შესაძლებელია. */
  roundWinners: string[] = [];
  /** მთელი თამაშის ჯამი. */
  totals: Record<string, number> = {};

  /**
   * დებულებების დასტა — ადრე ყოველ პარტიაზე ნულიდან ირეოდა, ამიტომ ერთი და
   * იგივე კითხვა საღამოში სამჯერ ჩნდებოდა. ახლა მეხსიერება რჩება.
   */
  private shoe = new ContentShoe('prompt.all', []);

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.loadSettings();
  }

  // MARK: - წარმოებული მნიშვნელობები

  get currentVoter(): Player | null {
    return this.players[this.voterIndex] ?? null;
  }
  get isSecret(): boolean {
    return this.settings.mode === 'secret';
  }
  get totalVotes(): number {
    return Object.values(this.tally).reduce((a, b) => a + b, 0);
  }

  player(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }
  votesFor(player: Player): number {
    return this.tally[player.id] ?? 0;
  }
  totalFor(player: Player): number {
    return this.totals[player.id] ?? 0;
  }

  /** საბოლოო რეიტინგი — ვინ ყველაზე ხშირად დაასახელეს. */
  get ranking(): Player[] {
    return [...this.players].sort((x, y) => {
      const a = this.totals[x.id] ?? 0;
      const b = this.totals[y.id] ?? 0;
      return a !== b ? b - a : x.name.localeCompare(y.name, 'ka');
    });
  }

  /** შეჯამების ეკრანისთვის — პოდიუმზე გადასაცემი შედეგები. */
  get results(): { player: Player; score: number }[] {
    return this.players.map((p) => ({ player: p, score: this.totals[p.id] ?? 0 }));
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    this.shoe = new ContentShoe(
      `prompt.${this.settings.categoryID ?? 'all'}`,
      PromptBank.deck(this.settings.categoryID),
    );
    this.round = 1;
    this.totals = {};
    this.loadPrompt();
  }

  beginVoting(): void {
    this.votes = {};
    this.voterIndex = 0;
    this.tally = {};
    this.roundWinners = [];
    this.phase = 'voting';
    this.notify();
  }

  /** სწრაფი რეჟიმი — ჯგუფმა ერთად აირჩია. */
  pick(player: Player): void {
    this.tally = { [player.id]: 1 };
    this.roundWinners = [player.id];
    this.award();
    this.phase = 'result';
    this.notify();
  }

  /** ფარული რეჟიმი — მიმდინარე მოთამაშემ ხმა მისცა. */
  castVote(target: Player): void {
    const voter = this.currentVoter;
    if (!voter) return;
    this.votes[voter.id] = target.id;
    this.tally[target.id] = (this.tally[target.id] ?? 0) + 1;

    if (this.voterIndex + 1 < this.players.length) {
      this.voterIndex += 1;
    } else {
      const values = Object.values(this.tally);
      const best = values.length > 0 ? Math.max(...values) : 0;
      this.roundWinners = best > 0 ? Object.keys(this.tally).filter((id) => this.tally[id] === best) : [];
      this.award();
      this.phase = 'result';
    }
    this.notify();
  }

  /** შემდეგი კითხვა; თუ რაუნდები ამოიწურა — შედეგი. */
  next(): void {
    if (this.round >= this.settings.rounds) {
      this.phase = 'summary';
      this.notify();
    } else {
      this.round += 1;
      this.loadPrompt();
    }
  }

  /** კითხვა არ მოგვწონს — ვცვლით რაუნდის დახარჯვის გარეშე. */
  skipPrompt(): void {
    this.loadPrompt();
  }

  restart(): void {
    this.startGame();
  }
  backToSetup(): void {
    this.phase = 'setup';
    this.notify();
  }

  // MARK: - შიდა

  private loadPrompt(): void {
    // დასტა ამოიწურა — თავიდან ვურევთ.
    this.currentPrompt = this.shoe.draw() ?? '—';
    this.votes = {};
    this.voterIndex = 0;
    this.tally = {};
    this.roundWinners = [];
    this.phase = 'prompt';
    this.notify();
  }

  private award(): void {
    for (const id of this.roundWinners) this.totals[id] = (this.totals[id] ?? 0) + 1;
  }

  // MARK: - პარამეტრები

  setMode(mode: MostLikelyMode): void {
    this.settings = { ...this.settings, mode };
    this.saveSettings();
  }
  setRounds(count: number): void {
    this.settings = { ...this.settings, rounds: Math.min(Math.max(3, count), 30) };
    this.saveSettings();
  }
  setCategory(id: string | null): void {
    this.settings = { ...this.settings, categoryID: id };
    this.saveSettings();
  }

  private saveSettings(): void {
    setJSON(SETTINGS_KEY, this.settings);
    this.notify();
  }

  private loadSettings(): void {
    const stored = getJSON<Partial<MostLikelySettings>>(SETTINGS_KEY, {});
    this.settings = {
      mode: stored.mode === 'secret' || stored.mode === 'quick' ? stored.mode : DEFAULTS.mode,
      rounds: typeof stored.rounds === 'number' ? stored.rounds : DEFAULTS.rounds,
      categoryID: typeof stored.categoryID === 'string' ? stored.categoryID : null,
    };
  }
}
