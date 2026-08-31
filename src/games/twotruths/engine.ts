import { Observable } from '../../core/observable';
import { shuffled } from '../../core/shuffle';
import { loadSettings, saveSettings, num, bool } from '../../core/settings';
import { TwoTruthsBank } from '../../content/banks';
import type { Player } from '../../core/roster';

/**
 * „ორი სიმართლე, ერთი ტყუილი“ — ავტორი წერს სამ ამბავს, ერთი მოგონილია.
 *
 * ქულა ორივე მხარეს: გამომცნობს — ტყუილის პოვნისთვის, ავტორს — იმდენი,
 * რამდენიც მოატყუა (ჭერით).
 *
 * პორტი: `Splash/Games/TwoTruths/TwoTruthsEngine.swift`.
 */

export type TwoTruthsPhase =
  | 'setup'         // ჯერების რაოდენობა და მინიშნებები
  | 'writeHandoff'  // ტელეფონი ავტორს გადაეცემა
  | 'write'         // ავტორი წერს სამ დებულებას და ნიშნავს ტყუილს
  | 'guessHandoff'  // ტელეფონი შემდეგ გამომცნობს გადაეცემა
  | 'guess'         // გამომცნობი ფარულად ირჩევს
  | 'result'        // ტყუილი ცხადდება
  | 'summary';

export interface TwoTruthsSettings {
  everyonePlays: boolean;
  fixedTurns: number;
  showHints: boolean;
}

export interface TwoTruthsHint {
  emoji: string;
  text: string;
}

const KEY = 'splash.twotruths.settings.v1';
const DEFAULTS: TwoTruthsSettings = { everyonePlays: true, fixedTurns: 5, showHints: true };
const clampTurns = (n: number) => Math.min(Math.max(2, n), 12);

export class TwoTruthsEngine extends Observable {
  /** ავტორს ერთ ჯერზე მაქსიმუმ ამდენი ერგება. */
  static readonly authorCap = 3;
  static readonly finderReward = 2;

  readonly players: Player[];
  settings: TwoTruthsSettings;

  phase: TwoTruthsPhase = 'setup';
  turnIndex = 0;

  statements: string[] = ['', '', ''];
  lieIndex = 0;
  /** ეკრანზე რიგი ირევა — ტყუილის ადგილი არ უნდა ჩანდეს. */
  displayOrder: number[] = [0, 1, 2];

  guesses: Record<string, number> = {};
  guesserIndex = 0;

  hints: TwoTruthsHint[] = [];

  totals: Record<string, number> = {};
  turnPoints: Record<string, number> = {};

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<TwoTruthsSettings>(KEY, DEFAULTS, (s) => ({
      everyonePlays: bool(s.everyonePlays, DEFAULTS.everyonePlays),
      fixedTurns: clampTurns(num(s.fixedTurns, DEFAULTS.fixedTurns, 2, 12)),
      showHints: bool(s.showHints, DEFAULTS.showHints),
    }));
  }

  // MARK: - წარმოებული მნიშვნელობები

  get totalTurns(): number {
    return this.settings.everyonePlays ? Math.max(1, this.players.length) : clampTurns(this.settings.fixedTurns);
  }

  get author(): Player {
    if (this.players.length === 0) return { id: '—', name: '—', score: 0 };
    return this.players[this.turnIndex % this.players.length];
  }

  /** ავტორის შემდეგ, წრეზე. */
  get guessers(): Player[] {
    const n = this.players.length;
    if (n <= 1) return [];
    const start = this.turnIndex % n;
    return Array.from({ length: n - 1 }, (_, i) => this.players[(start + i + 1) % n]);
  }

  get currentGuesser(): Player | null {
    return this.guessers[this.guesserIndex] ?? null;
  }

  get isLastTurn(): boolean {
    return this.turnIndex + 1 >= this.totalTurns;
  }

  player(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }
  totalFor(player: Player): number {
    return this.totals[player.id] ?? 0;
  }
  pointsFor(player: Player): number {
    return this.turnPoints[player.id] ?? 0;
  }

  statementAt(position: number): string {
    const written = this.displayOrder[position];
    return written === undefined ? '' : this.statements[written];
  }
  writtenIndexAt(position: number): number {
    return this.displayOrder[position] ?? 0;
  }
  displayPositionOf(written: number): number {
    const i = this.displayOrder.indexOf(written);
    return i === -1 ? 0 : i;
  }
  isLieAt(position: number): boolean {
    return this.writtenIndexAt(position) === this.lieIndex;
  }
  votersAt(position: number): Player[] {
    const written = this.writtenIndexAt(position);
    return this.guessers.filter((p) => this.guesses[p.id] === written);
  }

  get finders(): Player[] {
    return this.guessers.filter((p) => this.guesses[p.id] === this.lieIndex);
  }
  get fooled(): Player[] {
    return this.guessers.filter((p) => this.guesses[p.id] !== this.lieIndex);
  }

  get ranking(): Player[] {
    return [...this.players].sort((x, y) => {
      const a = this.totals[x.id] ?? 0;
      const b = this.totals[y.id] ?? 0;
      return a !== b ? b - a : x.name.localeCompare(y.name, 'ka');
    });
  }

  get results(): { player: Player; score: number }[] {
    return this.players.map((p) => ({ player: p, score: this.totalFor(p) }));
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    this.totals = {};
    this.turnIndex = 0;
    this.beginTurn();
  }

  beginWriting(): void {
    this.phase = 'write';
    this.notify();
  }

  rollHints(): void {
    this.hints = TwoTruthsBank.nudges();
    this.notify();
  }

  submit(written: string[], lie: number): void {
    const cleaned = written.map((s) => s.trim());
    if (cleaned.length !== 3 || cleaned.some((s) => !s) || lie < 0 || lie > 2) return;

    this.statements = cleaned;
    this.lieIndex = lie;
    this.displayOrder = shuffled([0, 1, 2]);
    this.guesses = {};
    this.guesserIndex = 0;

    // ჩიხის დაზღვევა: გამომცნობი რომ არ დარჩა, პირდაპირ შედეგზე.
    if (this.guessers.length === 0) {
      this.score();
      this.phase = 'result';
    } else {
      this.phase = 'guessHandoff';
    }
    this.notify();
  }

  beginGuessing(): void {
    this.phase = 'guess';
    this.notify();
  }

  castGuess(position: number): void {
    const guesser = this.currentGuesser;
    if (!guesser) return;
    this.guesses[guesser.id] = this.writtenIndexAt(position);

    if (this.guesserIndex + 1 < this.guessers.length) {
      this.guesserIndex += 1;
      this.phase = 'guessHandoff';
    } else {
      this.score();
      this.phase = 'result';
    }
    this.notify();
  }

  next(): void {
    if (this.isLastTurn) {
      this.phase = 'summary';
      this.notify();
    } else {
      this.turnIndex += 1;
      this.beginTurn();
    }
  }

  restart(): void {
    this.startGame();
  }
  backToSetup(): void {
    this.phase = 'setup';
    this.notify();
  }

  // MARK: - შიდა

  private beginTurn(): void {
    this.statements = ['', '', ''];
    this.lieIndex = 0;
    this.displayOrder = [0, 1, 2];
    this.guesses = {};
    this.guesserIndex = 0;
    this.turnPoints = {};
    this.hints = TwoTruthsBank.nudges();
    this.phase = 'writeHandoff';
    this.notify();
  }

  private score(): void {
    const points: Record<string, number> = {};
    let fooledCount = 0;

    for (const guesser of this.guessers) {
      if (this.guesses[guesser.id] === this.lieIndex) points[guesser.id] = TwoTruthsEngine.finderReward;
      else fooledCount += 1;
    }

    const authorPoints = Math.min(TwoTruthsEngine.authorCap, fooledCount);
    if (authorPoints > 0) points[this.author.id] = authorPoints;

    this.turnPoints = points;
    for (const [id, value] of Object.entries(points)) this.totals[id] = (this.totals[id] ?? 0) + value;
  }

  // MARK: - პარამეტრები

  setEveryonePlays(value: boolean): void {
    this.settings = { ...this.settings, everyonePlays: value };
    this.persist();
  }
  setFixedTurns(count: number): void {
    this.settings = { ...this.settings, everyonePlays: false, fixedTurns: clampTurns(count) };
    this.persist();
  }
  setShowHints(value: boolean): void {
    this.settings = { ...this.settings, showHints: value };
    this.persist();
  }

  private persist(): void {
    saveSettings(KEY, this.settings);
    this.notify();
  }
}
