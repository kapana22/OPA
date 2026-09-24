import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { TurnRotation } from '../../core/turnRotation';
import { loadSettings, saveSettings, num, categoryID } from '../../core/settings';
import { StandardsBank } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import type { Player } from '../../core/roster';

/**
 * „ნორმაა თუ არა?“ — ერთი მოლოდინი ჩნდება და ყველა წყვეტს, ნორმაა თუ გადამეტება.
 * რაუნდის **მკითხავი** პროგნოზსაც წერს; ქულა მხოლოდ ზუსტ პროგნოზს ერგება. უმცირესობის
 * ქულა მოვხსენით — „გულწრფელად უპასუხე“ წესს ეწინააღმდეგებოდა.
 *
 * პორტი: `Splash/Games/Standards/StandardsEngine.swift`.
 */

export type StandardsPhase = 'setup' | 'intro' | 'voting' | 'result' | 'summary';
export type StandardsVerdict = 'normal' | 'tooMuch';

export interface StandardsSettings {
  laps: number;
  categoryID: string | null;
}

const KEY = 'splash.standards.settings.v2'; // v1 ცალობით რაუნდს ინახავდა
const DEFAULTS: StandardsSettings = { laps: 1, categoryID: null };

export class StandardsEngine extends Observable {
  static readonly exactReward = 3;
  static readonly closeReward = 1;

  readonly players: Player[];
  settings: StandardsSettings;

  phase: StandardsPhase = 'setup';
  round = 1;
  currentExpectation = '';

  readerIndex = 0;
  voterIndex = 0;
  verdicts: Record<string, StandardsVerdict> = {};
  prediction: number | null = null;
  roundPoints: Record<string, number> = {};
  totals: Record<string, number> = {};

  normalCount: Record<string, number> = {};
  tooMuchCount: Record<string, number> = {};

  private shoe = new ContentShoe('standards.all', []);

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<StandardsSettings>(KEY, DEFAULTS, (s) => ({
      laps: num(s.laps, DEFAULTS.laps, 1, 3),
      categoryID: categoryID(s.categoryID, (id) => StandardsBank.category(id) !== undefined),
    }));
  }

  // MARK: - წარმოებული მნიშვნელობები

  get reader(): Player | null {
    if (this.players.length === 0) return null;
    return this.players[this.readerIndex % this.players.length];
  }

  /** მკითხავი პირველია რიგში — პროგნოზი მას მხოლოდ პირველ ჯერზე ეკითხება. */
  get votingOrder(): Player[] {
    const reader = this.reader;
    if (!reader) return this.players;
    return [reader, ...this.players.filter((p) => p.id !== reader.id)];
  }

  get currentVoter(): Player | null {
    return this.votingOrder[this.voterIndex] ?? null;
  }
  get currentVoterIsReader(): boolean {
    return this.voterIndex === 0;
  }

  get totalRounds(): number {
    return TurnRotation.rounds(this.settings.laps, this.players.length);
  }
  get isLastRound(): boolean {
    return this.round >= this.totalRounds;
  }

  get normalVotes(): number {
    return Object.values(this.verdicts).filter((v) => v === 'normal').length;
  }
  get tooMuchVotes(): number {
    return Object.values(this.verdicts).filter((v) => v === 'tooMuch').length;
  }
  get isUnanimous(): boolean {
    return this.normalVotes === 0 || this.tooMuchVotes === 0;
  }

  get minoritySide(): StandardsVerdict | null {
    if (this.isUnanimous || this.normalVotes === this.tooMuchVotes) return null;
    return this.normalVotes < this.tooMuchVotes ? 'normal' : 'tooMuch';
  }

  get predictionGap(): number | null {
    return this.prediction === null ? null : Math.abs(this.prediction - this.normalVotes);
  }

  verdictFor(player: Player): StandardsVerdict | undefined {
    return this.verdicts[player.id];
  }
  roundPoint(player: Player): number {
    return this.roundPoints[player.id] ?? 0;
  }
  totalFor(player: Player): number {
    return this.totals[player.id] ?? 0;
  }
  isReader(player: Player): boolean {
    return player.id === this.reader?.id;
  }
  isInMinority(player: Player): boolean {
    const side = this.minoritySide;
    return side !== null && this.verdicts[player.id] === side;
  }

  get ranking(): Player[] {
    return [...this.players].sort((x, y) => {
      const a = this.totals[x.id] ?? 0;
      const b = this.totals[y.id] ?? 0;
      return a !== b ? b - a : x.name.localeCompare(y.name, 'ka');
    });
  }

  /** ვინ ამბობს ყველაზე ხშირად „ნორმაა“. */
  get softest(): Player[] {
    return StandardsEngine.leaders(this.players, this.normalCount);
  }
  /** ვინ ამბობს ყველაზე ხშირად „გადამეტებაა“. */
  get strictest(): Player[] {
    return StandardsEngine.leaders(this.players, this.tooMuchCount);
  }

  private static leaders(players: Player[], counts: Record<string, number>): Player[] {
    const values = Object.values(counts);
    const best = values.length > 0 ? Math.max(...values) : 0;
    if (best <= 0) return [];
    return players.filter((p) => counts[p.id] === best);
  }

  get results(): { player: Player; score: number }[] {
    return this.players.map((p) => ({ player: p, score: this.totalFor(p) }));
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    this.shoe = new ContentShoe(
      `standards.${this.settings.categoryID ?? 'all'}`,
      StandardsBank.deck(this.settings.categoryID),
    );
    this.round = 1;
    this.readerIndex = 0;
    this.totals = {};
    this.normalCount = {};
    this.tooMuchCount = {};
    this.loadExpectation();
  }

  beginVoting(): void {
    if (this.phase !== 'intro') return;
    this.verdicts = {};
    this.prediction = null;
    this.roundPoints = {};
    this.voterIndex = 0;
    this.phase = 'voting';
    this.notify();
  }

  cast(verdict: StandardsVerdict, predicted: number | null = null): void {
    // ფაზის გარეთ ხმა არ მიიღება — თორემ ბოლო ხმის ორმაგი დაჭერა რაუნდს ორჯერ ითვლიდა.
    if (this.phase !== 'voting') return;
    const voter = this.currentVoter;
    if (!voter) return;
    this.verdicts[voter.id] = verdict;

    if (this.currentVoterIsReader && predicted !== null) {
      this.prediction = Math.min(Math.max(0, predicted), this.players.length);
    }

    if (verdict === 'normal') this.normalCount[voter.id] = (this.normalCount[voter.id] ?? 0) + 1;
    else this.tooMuchCount[voter.id] = (this.tooMuchCount[voter.id] ?? 0) + 1;

    if (this.voterIndex + 1 < this.votingOrder.length) {
      this.voterIndex += 1;
    } else {
      this.scoreRound();
      this.phase = 'result';
    }
    this.notify();
  }

  next(): void {
    if (this.phase !== 'result') return;
    if (this.isLastRound) {
      this.phase = 'summary';
      this.notify();
    } else {
      this.round += 1;
      this.readerIndex += 1;
      this.loadExpectation();
    }
  }

  swapExpectation(): void {
    if (this.phase !== 'intro') return;
    this.loadExpectation();
  }
  restart(): void {
    this.startGame();
  }
  backToSetup(): void {
    this.phase = 'setup';
    this.notify();
  }

  // MARK: - შიდა

  private loadExpectation(): void {
    this.currentExpectation = this.shoe.draw() ?? '—';
    this.verdicts = {};
    this.prediction = null;
    this.roundPoints = {};
    this.voterIndex = 0;
    this.phase = 'intro';
    this.notify();
  }

  private scoreRound(): void {
    const reader = this.reader;
    const gap = this.predictionGap;
    if (reader && gap !== null) {
      const points = gap === 0 ? StandardsEngine.exactReward : gap === 1 ? StandardsEngine.closeReward : 0;
      if (points > 0) {
        this.roundPoints[reader.id] = (this.roundPoints[reader.id] ?? 0) + points;
        this.totals[reader.id] = (this.totals[reader.id] ?? 0) + points;
      }
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
