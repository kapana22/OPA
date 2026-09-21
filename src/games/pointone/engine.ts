import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { Ticker } from '../../core/ticker';
import { loadSettings, saveSettings, num, bool, categoryID } from '../../core/settings';
import { PointOneBank } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import type { Player } from '../../core/roster';

/**
 * „აჩვენე ერთზე“ — 3·2·1 და ყველა ერთდროულად უთითებს.
 *
 * პორტი: `Splash/Games/PointOne/PointOneEngine.swift`.
 */

export type PointOnePhase = 'setup' | 'round' | 'summary';
export type PointOneStage = 'ready' | 'countdown' | 'tally';

export interface PointOneSettings {
  rounds: number;
  categoryID: string | null;
  useCountdown: boolean;
}

const KEY = 'splash.pointone.settings.v1';
const DEFAULTS: PointOneSettings = { rounds: 12, categoryID: null, useCountdown: true };

export class PointOneEngine extends Observable {
  readonly players: Player[];
  settings: PointOneSettings;

  phase: PointOnePhase = 'setup';
  stage: PointOneStage = 'ready';
  round = 1;
  currentQuestion = '';
  countdownValue = 3;

  picked = new Set<string>();
  totals: Record<string, number> = {};

  private shoe = new ContentShoe('pointone.all', []);
  private ticker = new Ticker();

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<PointOneSettings>(KEY, DEFAULTS, (s) => ({
      rounds: num(s.rounds, DEFAULTS.rounds, 3, 30),
      categoryID: categoryID(s.categoryID, (id) => PointOneBank.category(id) !== undefined),
      useCountdown: bool(s.useCountdown, DEFAULTS.useCountdown),
    }));
  }

  // MARK: - წარმოებული მნიშვნელობები

  player(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }
  totalFor(player: Player): number {
    return this.totals[player.id] ?? 0;
  }
  named(player: Player): boolean {
    return this.picked.has(player.id);
  }

  get ranking(): Player[] {
    return [...this.players].sort((x, y) => {
      const a = this.totals[x.id] ?? 0;
      const b = this.totals[y.id] ?? 0;
      return a !== b ? b - a : x.name.localeCompare(y.name, 'ka');
    });
  }

  get starsOfTheNight(): Player[] {
    const values = Object.values(this.totals);
    const best = values.length > 0 ? Math.max(...values) : 0;
    if (best <= 0) return [];
    return this.players.filter((p) => this.totals[p.id] === best);
  }

  /** ვისზეც არავის მიუთითებია — შეჯამების ცალკე სტრიქონი. */
  get neverNamed(): Player[] {
    if (!Object.values(this.totals).some((v) => v > 0)) return [];
    return this.players.filter((p) => (this.totals[p.id] ?? 0) === 0);
  }

  get results(): { player: Player; score: number }[] {
    return this.players.map((p) => ({ player: p, score: this.totalFor(p) }));
  }

  get canAdvance(): boolean {
    return this.stage === 'tally';
  }
  get isLastRound(): boolean {
    return this.round >= this.settings.rounds;
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    this.shoe = new ContentShoe(
      `pointone.${this.settings.categoryID ?? 'all'}`,
      PointOneBank.deck(this.settings.categoryID),
    );
    this.round = 1;
    this.totals = {};
    this.loadQuestion();
    this.phase = 'round';
    this.notify();
  }

  begin(): void {
    if (this.phase !== 'round' || this.stage !== 'ready') return;
    if (!this.settings.useCountdown) {
      this.stage = 'tally';
      Haptics.heavy();
      Sound.play('start');
      this.notify();
      return;
    }
    this.countdownValue = 3;
    this.stage = 'countdown';
    Haptics.medium();
    this.notify();

    this.ticker.start(0.85, () => {
      this.countdownValue -= 1;
      if (this.countdownValue > 0) {
        Haptics.medium();
      } else {
        this.ticker.stop();
        Haptics.heavy();
        this.stage = 'tally';
      }
      this.notify();
    });
  }

  toggle(player: Player): void {
    if (this.phase !== 'round' || this.stage === 'ready') return;
    if (this.picked.has(player.id)) {
      this.picked.delete(player.id);
      Haptics.tap();
    } else {
      this.picked.add(player.id);
      Haptics.medium();
    }
    this.notify();
  }

  next(): void {
    // ორმაგი შეხება: ბოლო რაუნდის ქულები ორჯერ ირიცხებოდა, შუაში კი რაუნდი ხტებოდა.
    if (this.phase !== 'round' || this.stage === 'ready') return;
    this.ticker.stop();
    for (const id of this.picked) this.totals[id] = (this.totals[id] ?? 0) + 1;
    if (this.isLastRound) {
      this.phase = 'summary';
    } else {
      this.round += 1;
      this.loadQuestion();
    }
    this.notify();
  }

  skipRound(): void {
    if (this.phase !== 'round' || this.stage === 'ready') return;
    this.ticker.stop();
    this.picked = new Set();
    if (this.isLastRound) {
      this.phase = 'summary';
    } else {
      this.round += 1;
      this.loadQuestion();
    }
    this.notify();
  }

  swapQuestion(): void {
    if (this.phase !== 'round' || this.stage !== 'ready') return;
    this.loadQuestion();
    Haptics.tap();
    this.notify();
  }

  restart(): void {
    this.startGame();
  }

  backToSetup(): void {
    this.ticker.stop();
    this.phase = 'setup';
    this.notify();
  }

  /** ეკრანიდან გასვლა — ათვლა ფონში არ უნდა გაგრძელდეს. */
  abandon(): void {
    this.ticker.stop();
  }

  // MARK: - შიდა

  private loadQuestion(): void {
    this.currentQuestion = this.shoe.draw() ?? '—';
    this.picked = new Set();
    this.stage = 'ready';
  }

  // MARK: - პარამეტრები

  setRounds(count: number): void {
    this.settings = { ...this.settings, rounds: Math.min(Math.max(3, count), 30) };
    this.persist();
  }
  setCategory(id: string | null): void {
    this.settings = { ...this.settings, categoryID: id };
    this.persist();
  }
  setCountdown(on: boolean): void {
    this.settings = { ...this.settings, useCountdown: on };
    this.persist();
  }

  private persist(): void {
    saveSettings(KEY, this.settings);
    this.notify();
  }
}
