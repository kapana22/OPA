import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { shuffled } from '../../core/shuffle';
import { loadSettings, saveSettings, num, bool, categoryID } from '../../core/settings';
import { DilemmaBank } from '../../content/banks';
import type { Player } from '../../core/roster';

/**
 * „როგორც ყველა“ — ორი ვარიანტია, ქულა იმას ერგება, ვინც უმრავლესობას დაემთხვა.
 * რამდენიმე რაუნდი **შებრუნებულია**: მაშინ იგებს უმცირესობა.
 *
 * პორტი: `Splash/Games/Herd/HerdEngine.swift`.
 */

export type HerdPhase = 'setup' | 'intro' | 'voting' | 'result' | 'summary';
export type HerdSide = 'a' | 'b';

export interface HerdDilemma {
  question: string;
  a: string;
  b: string;
}

export interface HerdSettings {
  rounds: number;
  categoryID: string | null;
  twists: boolean;
}

const KEY = 'splash.herd.settings.v1';
const DEFAULTS: HerdSettings = { rounds: 8, categoryID: null, twists: true };

export class HerdEngine extends Observable {
  readonly players: Player[];
  settings: HerdSettings;

  phase: HerdPhase = 'setup';
  round = 1;
  currentDilemma: HerdDilemma = DilemmaBank.categories[0].dilemmas[0];

  votes: Record<string, HerdSide> = {};
  voterIndex = 0;

  winningSide: HerdSide | null = null;
  roundWinners: string[] = [];
  isTie = false;

  totals: Record<string, number> = {};
  /** რომელ რაუნდებშია წესი შებრუნებული. */
  twistRounds = new Set<number>();
  /** ვინ რამდენჯერ დარჩა უმცირესობაში — „შავი ცხვარი“. */
  oddOneOutCount: Record<string, number> = {};

  private shoe = new ContentShoe('dilemma.all', []);

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<HerdSettings>(KEY, DEFAULTS, (s) => ({
      rounds: num(s.rounds, DEFAULTS.rounds, 3, 20),
      categoryID: categoryID(s.categoryID, (id) => DilemmaBank.category(id) !== undefined),
      twists: bool(s.twists, DEFAULTS.twists),
    }));
  }

  // MARK: - წარმოებული მნიშვნელობები

  get currentVoter(): Player | null {
    return this.players[this.voterIndex] ?? null;
  }
  get isReversed(): boolean {
    return this.twistRounds.has(this.round);
  }
  get countA(): number {
    return Object.values(this.votes).filter((v) => v === 'a').length;
  }
  get countB(): number {
    return Object.values(this.votes).filter((v) => v === 'b').length;
  }

  player(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }
  totalFor(player: Player): number {
    return this.totals[player.id] ?? 0;
  }
  countFor(side: HerdSide): number {
    return side === 'a' ? this.countA : this.countB;
  }
  voters(side: HerdSide): Player[] {
    return this.players.filter((p) => this.votes[p.id] === side);
  }
  didWin(player: Player): boolean {
    return this.roundWinners.includes(player.id);
  }

  get ranking(): Player[] {
    return [...this.players].sort((x, y) => {
      const a = this.totals[x.id] ?? 0;
      const b = this.totals[y.id] ?? 0;
      return a !== b ? b - a : x.name.localeCompare(y.name, 'ka');
    });
  }

  get oddOneOut(): Player[] {
    const values = Object.values(this.oddOneOutCount);
    const best = values.length > 0 ? Math.max(...values) : 0;
    if (best <= 0) return [];
    return this.players.filter((p) => this.oddOneOutCount[p.id] === best);
  }
  oddCount(player: Player): number {
    return this.oddOneOutCount[player.id] ?? 0;
  }

  get results(): { player: Player; score: number }[] {
    return this.players.map((p) => ({ player: p, score: this.totalFor(p) }));
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    this.shoe = new ContentShoe(
      `dilemma.${this.settings.categoryID ?? 'all'}`,
      DilemmaBank.deck(this.settings.categoryID),
    );
    this.round = 1;
    this.totals = {};
    this.oddOneOutCount = {};
    this.twistRounds = HerdEngine.pickTwists(this.settings.rounds, this.settings.twists);
    this.loadDilemma();
  }

  beginVoting(): void {
    this.votes = {};
    this.voterIndex = 0;
    this.phase = 'voting';
    this.notify();
  }

  castVote(side: HerdSide): void {
    const voter = this.currentVoter;
    if (!voter) return;
    this.votes[voter.id] = side;

    if (this.voterIndex + 1 < this.players.length) this.voterIndex += 1;
    else this.finishRound();
    this.notify();
  }

  next(): void {
    if (this.round >= this.settings.rounds) {
      this.phase = 'summary';
      this.notify();
    } else {
      this.round += 1;
      this.loadDilemma();
    }
  }

  skipDilemma(): void {
    this.loadDilemma();
  }
  restart(): void {
    this.startGame();
  }
  backToSetup(): void {
    this.phase = 'setup';
    this.notify();
  }

  // MARK: - შიდა

  private loadDilemma(): void {
    const key = this.shoe.draw();
    const found = key ? DilemmaBank.byKey(key) : undefined;
    if (found) this.currentDilemma = found;

    this.votes = {};
    this.voterIndex = 0;
    this.winningSide = null;
    this.roundWinners = [];
    this.isTie = false;
    this.phase = 'intro';
    this.notify();
  }

  private finishRound(): void {
    const a = this.countA;
    const b = this.countB;

    if (a === b) {
      this.isTie = true;
      this.winningSide = null;
      this.roundWinners = [];
    } else {
      this.isTie = false;
      const bigger: HerdSide = a > b ? 'a' : 'b';
      const smaller: HerdSide = a > b ? 'b' : 'a';
      const scoring = this.isReversed ? smaller : bigger;
      this.winningSide = scoring;
      this.roundWinners = this.voters(scoring).map((p) => p.id);
      for (const id of this.roundWinners) this.totals[id] = (this.totals[id] ?? 0) + 1;

      // „შავი ცხვარი“ მხოლოდ ჩვეულებრივ რაუნდში ითვლება — შებრუნებულში
      // უმცირესობაში ყოფნა ხომ სწორედ მიზანია.
      if (!this.isReversed) {
        for (const p of this.voters(smaller)) this.oddOneOutCount[p.id] = (this.oddOneOutCount[p.id] ?? 0) + 1;
      }
    }

    this.phase = 'result';
  }

  /** შებრუნებული რაუნდები — მეოთხედი, პირველის გარდა (პირველი წესს ასწავლის). */
  private static pickTwists(rounds: number, enabled: boolean): Set<number> {
    if (!enabled || rounds < 4) return new Set();
    const count = Math.max(1, Math.floor(rounds / 4));
    const candidates = Array.from({ length: rounds - 1 }, (_, i) => i + 2);
    return new Set(shuffled(candidates).slice(0, count));
  }

  // MARK: - პარამეტრები

  setRounds(count: number): void {
    this.settings = { ...this.settings, rounds: Math.min(Math.max(3, count), 20) };
    this.persist();
  }
  setCategory(id: string | null): void {
    this.settings = { ...this.settings, categoryID: id };
    this.persist();
  }
  setTwists(on: boolean): void {
    this.settings = { ...this.settings, twists: on };
    this.persist();
  }

  private persist(): void {
    saveSettings(KEY, this.settings);
    this.notify();
  }
}
