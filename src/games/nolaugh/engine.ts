import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { Ticker } from '../../core/ticker';
import { TurnRotation } from '../../core/turnRotation';
import { loadSettings, saveSettings, num, categoryID } from '../../core/settings';
import { LaughBank } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import type { Player } from '../../core/roster';

/**
 * „არ გაიცინო“ — ერთი უძლებს, დანარჩენები ცდილობენ გააცინონ.
 * გაუძლო — +2; გაიცინა — თითო ქულა ყველა მცდელს.
 *
 * პორტი: `Splash/Games/NoLaugh/NoLaughEngine.swift`.
 */

export type NoLaughPhase = 'setup' | 'announce' | 'round' | 'result' | 'summary';
export type NoLaughVerdict = 'survived' | 'laughed';

export interface NoLaughSettings {
  seconds: number;
  laps: number;
  categoryID: string | null;
}

const KEY = 'splash.nolaugh.settings.v2'; // v1 ცალობით რაუნდს ინახავდა
const DEFAULTS: NoLaughSettings = { seconds: 45, laps: 1, categoryID: null };

export class NoLaughEngine extends Observable {
  readonly players: Player[];
  settings: NoLaughSettings;

  phase: NoLaughPhase = 'setup';
  round = 1;
  currentTask = '';
  tasksThisRound = 1;
  remaining = 0;
  isPaused = false;
  verdict: NoLaughVerdict = 'survived';
  scores: Record<string, number> = {};

  private shoe = new ContentShoe('laugh.all', []);
  private ticker = new Ticker();

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<NoLaughSettings>(KEY, DEFAULTS, (s) => ({
      seconds: num(s.seconds, DEFAULTS.seconds, 15, 120),
      laps: num(s.laps, DEFAULTS.laps, 1, 3),
      categoryID: categoryID(s.categoryID, (id) => LaughBank.category(id) !== undefined),
    }));
  }

  // MARK: - წარმოებული მნიშვნელობები

  get totalRounds(): number {
    return TurnRotation.rounds(this.settings.laps, this.players.length);
  }

  /** ვინ უძლებს ამ რაუნდში. */
  get holder(): Player | null {
    if (this.players.length === 0) return null;
    return this.players[(this.round - 1) % this.players.length];
  }

  get challengers(): Player[] {
    const holder = this.holder;
    return holder ? this.players.filter((p) => p.id !== holder.id) : this.players;
  }

  get isLastRound(): boolean {
    return this.round >= this.totalRounds;
  }

  get categoryName(): string {
    return (this.settings.categoryID ? LaughBank.category(this.settings.categoryID) : undefined)?.name ?? 'ყველა კატეგორია';
  }

  scoreFor(player: Player): number {
    return this.scores[player.id] ?? 0;
  }

  get ranking(): Player[] {
    return [...this.players].sort((x, y) => {
      const a = this.scores[x.id] ?? 0;
      const b = this.scores[y.id] ?? 0;
      return a !== b ? b - a : x.name.localeCompare(y.name, 'ka');
    });
  }

  get champion(): Player | null {
    const top = this.ranking[0];
    return top && this.scoreFor(top) > 0 ? top : null;
  }

  get results(): { player: Player; score: number }[] {
    return this.players.map((p) => ({ player: p, score: this.scoreFor(p) }));
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    this.shoe = new ContentShoe(
      `laugh.${this.settings.categoryID ?? 'all'}`,
      LaughBank.deck(this.settings.categoryID),
    );
    this.round = 1;
    this.scores = {};
    this.phase = 'announce';
    this.notify();
  }

  beginRound(): void {
    if (this.phase !== 'announce') return;
    this.tasksThisRound = 1;
    this.remaining = this.settings.seconds;
    this.isPaused = false;
    this.verdict = 'survived';
    this.drawTask();
    this.phase = 'round';
    this.startTicker();
    this.notify();
  }

  nextTask(): void {
    if (this.phase !== 'round') return;
    this.tasksThisRound += 1;
    this.drawTask();
    Haptics.tap();
    this.notify();
  }

  togglePause(): void {
    if (this.phase !== 'round') return;
    this.isPaused = !this.isPaused;
    Haptics.tap();
    this.notify();
  }

  markLaughed(): void {
    if (this.phase !== 'round') return;
    this.ticker.stop();
    this.verdict = 'laughed';
    for (const p of this.challengers) this.scores[p.id] = (this.scores[p.id] ?? 0) + 1;
    this.phase = 'result';
    this.notify();
  }

  next(): void {
    // ორმაგი შეხება რაუნდს არ უნდა გამოტოვებდეს — თორემ ვიღაცას ჯერი არ ხვდება.
    if (this.phase !== 'result') return;
    if (this.isLastRound) {
      this.phase = 'summary';
    } else {
      this.round += 1;
      this.phase = 'announce';
    }
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

  /** ეკრანიდან გასვლა. */
  stop(): void {
    this.ticker.stop();
  }

  // MARK: - შიდა

  private drawTask(): void {
    this.currentTask = this.shoe.draw() ?? '—';
  }

  private startTicker(): void {
    this.ticker.start(1, () => {
      if (this.isPaused) return;
      if (this.remaining <= 0) {
        this.survive();
        return;
      }
      this.remaining -= 1;
      if (this.remaining === 0) {
        this.survive();
      } else if (this.remaining <= 5) {
        Haptics.tickHot();
        Sound.play('tickHot');
      }
      this.notify();
    });
  }

  private survive(): void {
    if (this.phase !== 'round') return;
    this.ticker.stop();
    this.remaining = 0;
    this.verdict = 'survived';
    const holder = this.holder;
    if (holder) this.scores[holder.id] = (this.scores[holder.id] ?? 0) + 2;
    this.phase = 'result';
    this.notify();
  }

  // MARK: - პარამეტრები

  setSeconds(value: number): void {
    this.settings = { ...this.settings, seconds: Math.min(Math.max(15, value), 120) };
    this.persist();
  }
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
