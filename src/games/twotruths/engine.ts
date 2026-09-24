import { Observable } from '../../core/observable';
import { shuffled } from '../../core/shuffle';
import { loadSettings, saveSettings, num, bool } from '../../core/settings';
import { TwoTruthsBank } from '../../content/banks';
import { TurnRotation } from '../../core/turnRotation';
import type { Player } from '../../core/roster';

/**
 * „ორი სიმართლე, ერთი ტყუილი“ — ავტორი წერს სამ ამბავს, ერთი მოგონილია.
 *
 * ქულა ორივე მხარეს და თანაბრად: ყოველი გამოცნობა ორის დუელია — იპოვე
 * ტყუილი და +2 შენ, მოტყუვდი და +2 ავტორს. ჭერი არ არის: ადრე ავტორი
 * მაქსიმუმ +3-ს იღებდა, მპოვნელი კი ყოველ ჯერზე +2-ს — საუკეთესო
 * მატყუარა ვერასდროს იგებდა.
 *
 * პორტი: `Splash/Games/TwoTruths/TwoTruthsEngine.swift`.
 */

export type TwoTruthsPhase =
  | 'setup'         // წრეების რაოდენობა და მინიშნებები
  | 'writeHandoff'  // ტელეფონი ავტორს გადაეცემა
  | 'write'         // ავტორი წერს სამ დებულებას და ნიშნავს ტყუილს
  | 'guessHandoff'  // ტელეფონი შემდეგ გამომცნობს გადაეცემა
  | 'guess'         // გამომცნობი ფარულად ირჩევს
  | 'result'        // ტყუილი ცხადდება
  | 'summary';

export interface TwoTruthsSettings {
  /** რამდენჯერ წერს თითოეული — მთელი წრეები, რომ ჯერი ყველას თანაბრად ხვდებოდეს. */
  laps: number;
  showHints: boolean;
}

export interface TwoTruthsHint {
  emoji: string;
  text: string;
}

const KEY = 'splash.twotruths.settings.v1';
const DEFAULTS: TwoTruthsSettings = { laps: 1, showHints: true };
const MAX_LAPS = TurnRotation.lapOptions[TurnRotation.lapOptions.length - 1];

/** ძველი შენახული პარამეტრი: `everyonePlays` / `fixedTurns` (3 / 5 / 8 ჯერი). */
interface LegacySettings {
  everyonePlays?: unknown;
  fixedTurns?: unknown;
}

export class TwoTruthsEngine extends Observable {
  /** ტყუილის მპოვნელს. */
  static readonly finderReward = 2;
  /** ავტორს — ყოველ მოტყუებულზე, ჭერის გარეშე. */
  static readonly authorRewardPerFooled = 2;

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
    this.settings = loadSettings<TwoTruthsSettings>(KEY, DEFAULTS, (s) => {
      const legacy = s as LegacySettings;
      const laps =
        typeof s.laps === 'number'
          ? num(s.laps, DEFAULTS.laps, 1, MAX_LAPS)
          : legacy.everyonePlays === false && typeof legacy.fixedTurns === 'number'
            ? TurnRotation.lapsFromLegacy(legacy.fixedTurns, players.length)
            : DEFAULTS.laps;
      return { laps, showHints: bool(s.showHints, DEFAULTS.showHints) };
    });
  }

  // MARK: - წარმოებული მნიშვნელობები

  get totalTurns(): number {
    return TurnRotation.rounds(this.settings.laps, this.players.length);
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

  /** ყველა, ვინც პირველ ადგილს იყოფს — ფრე ანბანით არ წყდება (`PodiumAward`-ის წესი). ნულით — არავინ. */
  get winners(): Player[] {
    const best = Math.max(0, ...this.players.map((p) => this.totalFor(p)));
    return best > 0 ? this.ranking.filter((p) => this.totalFor(p) === best) : [];
  }

  /** სპორტული ადგილი: ორი პირველის შემდეგ მესამე მოდის. */
  placeOf(player: Player): number {
    const score = this.totalFor(player);
    return 1 + this.players.filter((p) => this.totalFor(p) > score).length;
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
    if (this.phase !== 'writeHandoff') return;
    this.phase = 'write';
    this.notify();
  }

  rollHints(): void {
    this.hints = TwoTruthsBank.nudges();
    this.notify();
  }

  /** მიღებულია თუ არა — უარისას ეკრანმა დაწერილი არ უნდა წაშალოს. */
  submit(written: string[], lie: number): boolean {
    if (this.phase !== 'write') return false;
    if (!TwoTruthsEngine.isValid(written, lie)) return false;
    const cleaned = written.map((s) => s.trim());

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
    return true;
  }

  /** სამი შევსებული, ერთმანეთისგან განსხვავებული ამბავი და მონიშნული ტყუილი. */
  static isValid(written: string[], lie: number | null): boolean {
    const cleaned = written.map((s) => s.trim());
    if (lie === null || cleaned.length !== 3 || cleaned.some((s) => !s) || lie < 0 || lie > 2) return false;
    return new Set(cleaned).size === 3;   // ერთნაირ ამბებში ტყუილი ვერ იმალება
  }

  beginGuessing(): void {
    if (this.phase !== 'guessHandoff') return;
    this.phase = 'guess';
    this.notify();
  }

  castGuess(position: number): void {
    // ორმაგი შეხება ბოლო გამომცნობზე ქულას ორჯერ დაარიცხავდა.
    if (this.phase !== 'guess' || position < 0 || position > 2) return;
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
    if (this.phase !== 'result') return;
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

    const authorPoints = fooledCount * TwoTruthsEngine.authorRewardPerFooled;
    if (authorPoints > 0) points[this.author.id] = authorPoints;

    this.turnPoints = points;
    for (const [id, value] of Object.entries(points)) this.totals[id] = (this.totals[id] ?? 0) + value;
  }

  // MARK: - პარამეტრები

  setLaps(value: number): void {
    this.settings = { ...this.settings, laps: Math.min(Math.max(1, value), MAX_LAPS) };
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
