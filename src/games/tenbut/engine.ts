import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { TurnRotation } from '../../core/turnRotation';
import { loadSettings, saveSettings, num, categoryID } from '../../core/settings';
import { TenButBank } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import type { Player } from '../../core/roster';

/**
 * „10-ია, მაგრამ...“ — ერთი ჩვევა ჩნდება; **სამიზნე** ფარულად აფასებს 0-დან
 * 10-მდე, დანარჩენები კი გამოიცნობენ, რა დაწერა.
 *
 * ქულა ორივე მხარესაა: გამომცნობს — სიზუსტისთვის, სამიზნეს — გაკვირვებისთვის.
 * სწორედ ამიტომ შუა ციფრის დაჭერა მოგებული სტრატეგია აღარაა.
 *
 * პორტი: `Splash/Games/TenBut/TenButEngine.swift`.
 */

export type TenButPhase = 'setup' | 'intro' | 'rating' | 'result' | 'summary';

export interface TenButSettings {
  laps: number;
  categoryID: string | null;
}

const KEY = 'splash.tenbut.settings.v2'; // v1 ცალობით რაუნდს ინახავდა
const DEFAULTS: TenButSettings = { laps: 1, categoryID: null };

export class TenButEngine extends Observable {
  static readonly exactReward = 3;
  static readonly closeReward = 2;
  static readonly nearReward = 1;
  /** ამ სხვაობიდან ითვლება, რომ სამიზნემ გააკვირვა. */
  static readonly surpriseGap = 3;

  readonly players: Player[];
  settings: TenButSettings;

  phase: TenButPhase = 'setup';
  round = 1;
  currentFlaw = '';

  targetIndex = 0;
  guesserStep = 0;

  targetScore: number | null = null;
  guesses: Record<string, number> = {};
  roundPoints: Record<string, number> = {};
  totals: Record<string, number> = {};

  private shoe = new ContentShoe('tenbut.all', []);

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<TenButSettings>(KEY, DEFAULTS, (s) => ({
      laps: num(s.laps, DEFAULTS.laps, 1, 3),
      categoryID: categoryID(s.categoryID, (id) => TenButBank.category(id) !== undefined),
    }));
  }

  // MARK: - წარმოებული მნიშვნელობები

  get target(): Player | null {
    if (this.players.length === 0) return null;
    return this.players[this.targetIndex % this.players.length] ?? null;
  }

  get guessers(): Player[] {
    const target = this.target;
    return target ? this.players.filter((p) => p.id !== target.id) : this.players;
  }

  /** ვის ხელშია ტელეფონი ახლა — ჯერ სამიზნე, მერე გამომცნობები. */
  get currentHolder(): Player | null {
    if (this.targetScore === null) return this.target;
    return this.guessers[this.guesserStep] ?? null;
  }

  get holderNumber(): number {
    return this.targetScore === null ? 1 : this.guesserStep + 2;
  }
  get holderTotal(): number {
    return this.players.length;
  }

  get totalRounds(): number {
    return TurnRotation.rounds(this.settings.laps, this.players.length);
  }
  get isLastRound(): boolean {
    return this.round >= this.totalRounds;
  }

  player(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }
  guessFor(player: Player): number | undefined {
    return this.guesses[player.id];
  }
  roundPoint(player: Player): number {
    return this.roundPoints[player.id] ?? 0;
  }
  totalFor(player: Player): number {
    return this.totals[player.id] ?? 0;
  }

  gapFor(player: Player): number | null {
    const actual = this.targetScore;
    const guess = this.guesses[player.id];
    if (actual === null || guess === undefined) return null;
    return Math.abs(guess - actual);
  }

  get exactGuessers(): Player[] {
    return this.guessers.filter((p) => this.gapFor(p) === 0);
  }
  get surprisedCount(): number {
    return this.guessers.filter((p) => (this.gapFor(p) ?? 0) >= TenButEngine.surpriseGap).length;
  }

  get ranking(): Player[] {
    return [...this.players].sort((x, y) => {
      const a = this.totals[x.id] ?? 0;
      const b = this.totals[y.id] ?? 0;
      return a !== b ? b - a : x.name.localeCompare(y.name, 'ka');
    });
  }

  get champion(): Player | null {
    const top = this.ranking[0];
    return top && this.totalFor(top) > 0 ? top : null;
  }

  get results(): { player: Player; score: number }[] {
    return this.players.map((p) => ({ player: p, score: this.totalFor(p) }));
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    this.shoe = new ContentShoe(
      `tenbut.${this.settings.categoryID ?? 'all'}`,
      TenButBank.deck(this.settings.categoryID),
    );
    this.round = 1;
    this.targetIndex = 0;
    this.totals = {};
    this.loadFlaw();
  }

  beginRating(): void {
    this.targetScore = null;
    this.guesses = {};
    this.roundPoints = {};
    this.guesserStep = 0;
    this.phase = 'rating';
    this.notify();
  }

  submit(value: number): void {
    const clamped = Math.min(Math.max(0, Math.round(value)), 10);

    if (this.targetScore === null) {
      this.targetScore = clamped;
      this.guesserStep = 0;
      // მარტო სამიზნეა მაგიდასთან — გამოცნობა ვერავინ მოასწრებს.
      if (this.guessers.length === 0) {
        this.scoreRound();
        this.phase = 'result';
      }
      this.notify();
      return;
    }

    const holder = this.currentHolder;
    if (!holder) return;
    this.guesses[holder.id] = clamped;

    if (this.guesserStep + 1 < this.guessers.length) {
      this.guesserStep += 1;
    } else {
      this.scoreRound();
      this.phase = 'result';
    }
    this.notify();
  }

  next(): void {
    if (this.isLastRound) {
      this.phase = 'summary';
      this.notify();
    } else {
      this.round += 1;
      this.targetIndex += 1;
      this.loadFlaw();
    }
  }

  swapFlaw(): void {
    this.loadFlaw();
  }
  restart(): void {
    this.startGame();
  }
  backToSetup(): void {
    this.phase = 'setup';
    this.notify();
  }

  // MARK: - შიდა

  private loadFlaw(): void {
    this.currentFlaw = this.shoe.draw() ?? '—';
    this.targetScore = null;
    this.guesses = {};
    this.roundPoints = {};
    this.guesserStep = 0;
    this.phase = 'intro';
    this.notify();
  }

  private scoreRound(): void {
    const actual = this.targetScore;
    if (actual === null) return;

    let surprised = 0;
    for (const player of this.guessers) {
      const guess = this.guesses[player.id];
      if (guess === undefined) continue;
      const gap = Math.abs(guess - actual);
      const points =
        gap === 0 ? TenButEngine.exactReward : gap === 1 ? TenButEngine.closeReward : gap === 2 ? TenButEngine.nearReward : 0;
      if (points > 0) {
        this.roundPoints[player.id] = points;
        this.totals[player.id] = (this.totals[player.id] ?? 0) + points;
      }
      if (gap >= TenButEngine.surpriseGap) surprised += 1;
    }

    const target = this.target;
    if (target && surprised > 0) {
      this.roundPoints[target.id] = surprised;
      this.totals[target.id] = (this.totals[target.id] ?? 0) + surprised;
    }
    Haptics.success();
  }

  // MARK: - პარამეტრები

  setLaps(value: number): void {
    this.settings = { ...this.settings, laps: Math.min(Math.max(1, value), 3) };
    this.persist();
  }
  setCategory(id: string | null): void {
    this.settings = { ...this.settings, categoryID: id };
    this.persist();
  }

  private persist(): void {
    saveSettings(KEY, this.settings);
    this.notify();
  }
}
