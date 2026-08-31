import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { TurnRotation } from '../../core/turnRotation';
import { loadSettings, saveSettings, num, categoryID } from '../../core/settings';
import { SpectrumBank } from '../../content/banks';
import type { Player } from '../../core/roster';

/**
 * „ტალღა“ — **კოოპერაციული**. ერთი მინიშნებას იძლევა, მაგიდა ერთად ცდილობს
 * სამიზნეს მოხვედრას. მოიგებთ ან წააგებთ ერთად.
 *
 * პორტი: `Splash/Games/Wavelength/WavelengthEngine.swift`.
 */

export type WavelengthPhase = 'setup' | 'clue' | 'guess' | 'result' | 'summary';
export type WavelengthVerdict = 'brilliant' | 'passed' | 'missed';

export interface Band {
  id: number;
  halfWidth: number;
  points: number;
}

export interface Spectrum {
  left: string;
  right: string;
}

export interface WavelengthSettings {
  categoryID: string | null;
  laps: number;
}

const KEY = 'splash.wavelength.settings.v2'; // v1 ცალობით რაუნდს ინახავდა
const DEFAULTS: WavelengthSettings = { categoryID: null, laps: 1 };

export class WavelengthEngine extends Observable {
  /** ქულების ზოლები — რაც ვიწროა, მით მეტი ქულა. */
  static readonly bands: Band[] = [
    { id: 4, halfWidth: 0.04, points: 4 },
    { id: 3, halfWidth: 0.1, points: 3 },
    { id: 2, halfWidth: 0.18, points: 2 },
    { id: 1, halfWidth: 0.28, points: 1 },
  ];

  readonly players: Player[];
  settings: WavelengthSettings;

  phase: WavelengthPhase = 'setup';
  round = 1;
  spectrum: Spectrum = { left: '—', right: '—' };
  target = 0.5;
  guess = 0.5;
  lastPoints = 0;
  /** მაგიდის საერთო ქულა — ინდივიდუალური არაა, თამაში კოოპერაციულია. */
  tableScore = 0;
  clueScores: Record<string, number> = {};

  private shoe = new ContentShoe('spectrum.all', []);
  private shoeReady = false;

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<WavelengthSettings>(KEY, DEFAULTS, (s) => ({
      categoryID: categoryID(s.categoryID, (id) => SpectrumBank.category(id) !== undefined),
      laps: num(s.laps, DEFAULTS.laps, 1, 3),
    }));
  }

  // MARK: - წარმოებული მნიშვნელობები

  get totalRounds(): number {
    return TurnRotation.rounds(this.settings.laps, this.players.length);
  }
  get clueGiver(): Player | null {
    if (this.players.length === 0) return null;
    return this.players[(this.round - 1) % this.players.length];
  }
  get distance(): number {
    return Math.abs(this.guess - this.target);
  }
  get isLastRound(): boolean {
    return this.round >= this.totalRounds;
  }

  clueScore(player: Player): number {
    return this.clueScores[player.id] ?? 0;
  }

  /** მიზანი — საშუალოდ 2 ქულა რაუნდზე. */
  get goal(): number {
    return this.totalRounds * 2;
  }
  get maxScore(): number {
    return this.totalRounds * (WavelengthEngine.bands[0]?.points ?? 4);
  }

  get verdict(): WavelengthVerdict {
    if (this.tableScore >= this.goal + this.totalRounds) return 'brilliant';
    return this.tableScore >= this.goal ? 'passed' : 'missed';
  }

  /** საერთო ტაბლოზე რამდენი ერგება ყველას — თამაში კოოპერაციულია. */
  get rosterReward(): number {
    return this.verdict === 'brilliant' ? 3 : this.verdict === 'passed' ? 2 : 1;
  }

  get bestClueGivers(): Player[] {
    const values = Object.values(this.clueScores);
    const best = values.length > 0 ? Math.max(...values) : 0;
    if (best <= 0) return [];
    return this.players.filter((p) => this.clueScores[p.id] === best);
  }

  get ranking(): Player[] {
    return [...this.players].sort((x, y) => {
      const a = this.clueScores[x.id] ?? 0;
      const b = this.clueScores[y.id] ?? 0;
      return a !== b ? b - a : x.name.localeCompare(y.name, 'ka');
    });
  }

  pointsForDistance(d: number): number {
    for (const band of [...WavelengthEngine.bands].sort((x, y) => x.halfWidth - y.halfWidth)) {
      if (d <= band.halfWidth) return band.points;
    }
    return 0;
  }

  /** 0…1 → 0…100, ეკრანზე საჩვენებლად. */
  mark(value: number): number {
    return Math.round(value * 100);
  }

  // MARK: - მიმდინარეობა

  startGame(): void {
    this.round = 1;
    this.tableScore = 0;
    this.clueScores = {};
    this.lastPoints = 0;
    this.loadRound();
  }

  beginGuess(): void {
    this.guess = 0.5;
    this.phase = 'guess';
    this.notify();
  }

  setGuess(value: number): void {
    this.guess = Math.min(Math.max(0, value), 1);
    this.notify();
  }

  lockGuess(): void {
    this.lastPoints = this.pointsForDistance(this.distance);
    this.tableScore += this.lastPoints;
    const giver = this.clueGiver;
    if (giver) this.clueScores[giver.id] = (this.clueScores[giver.id] ?? 0) + this.lastPoints;
    this.phase = 'result';
    this.notify();
  }

  next(): void {
    if (this.isLastRound) {
      this.phase = 'summary';
      this.notify();
    } else {
      this.round += 1;
      this.loadRound();
    }
  }

  skipSpectrum(): void {
    this.loadRound();
  }
  restart(): void {
    this.startGame();
  }
  backToSetup(): void {
    this.phase = 'setup';
    this.notify();
  }

  // MARK: - შიდა

  private loadRound(): void {
    this.spectrum = this.pickSpectrum();
    // კიდეზე მიკრული სამიზნე ცუდ მინიშნებას აჩენს — შუა ველში ვტოვებთ.
    this.target = 0.08 + Math.random() * (0.92 - 0.08);
    this.guess = 0.5;
    this.lastPoints = 0;
    this.phase = 'clue';
    this.notify();
  }

  private pickSpectrum(): Spectrum {
    if (!this.shoeReady) this.rebuildShoe();
    const key = this.shoe.draw();
    return key ? SpectrumBank.parse(key) : { left: '—', right: '—' };
  }

  private rebuildShoe(): void {
    this.shoe = new ContentShoe(
      `spectrum.${this.settings.categoryID ?? 'all'}`,
      SpectrumBank.deck(this.settings.categoryID),
    );
    this.shoeReady = true;
  }

  // MARK: - პარამეტრები

  setCategory(id: string | null): void {
    this.settings = { ...this.settings, categoryID: id };
    this.shoeReady = false;
    this.persist();
  }
  setLaps(value: number): void {
    this.settings = { ...this.settings, laps: Math.min(Math.max(1, value), 3) };
    this.persist();
  }

  private persist(): void {
    saveSettings(KEY, this.settings);
    this.notify();
  }
}
