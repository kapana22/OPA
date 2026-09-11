import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { Ticker } from '../../core/ticker';
import { loadSettings, saveSettings, num, categoryID } from '../../core/settings';
import { WordBank, type WordCategory } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import type { Player } from '../../core/roster';

/**
 * „ბომბი“ — დამალული ტაიმერი წრეზე გადადის. ვის ხელშიც აფეთქდა, სიცოცხლეს კარგავს.
 *
 * პორტი: `Splash/Games/Bomb/BombEngine.swift`.
 */

export type BombPhase = 'setup' | 'playing' | 'exploded' | 'gameOver';

export interface BombSettings {
  lives: number;
  minSeconds: number;
  maxSeconds: number;
  categoryID: string | null;
}

const KEY = 'splash.bomb.settings.v1';
const DEFAULTS: BombSettings = { lives: 3, minSeconds: 20, maxSeconds: 60, categoryID: null };

export class BombEngine extends Observable {
  readonly players: Player[];
  settings: BombSettings;

  phase: BombPhase = 'setup';
  lives: Record<string, number> = {};
  currentIndex = 0;
  category: WordCategory = WordBank.categories[0];
  round = 1;
  victimID: string | null = null;
  winner: Player | null = null;
  /** 0 → 1: რამდენად ახლოსაა აფეთქება. ეკრანი და ტკაცუნი ამაზე დგას. */
  tension = 0;

  private categoryShoe = new ContentShoe('bomb.category', WordBank.categories.map((c) => c.id));
  private fuse = 0;
  private elapsed = 0;
  private nextTickAt = 0;
  private ticker = new Ticker();

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<BombSettings>(KEY, DEFAULTS, (s) => ({
      lives: num(s.lives, DEFAULTS.lives, 1, 5),
      minSeconds: num(s.minSeconds, DEFAULTS.minSeconds, 5, 300),
      maxSeconds: num(s.maxSeconds, DEFAULTS.maxSeconds, 5, 300),
      categoryID: categoryID(s.categoryID, (id) => WordBank.category(id) !== undefined),
    }));
  }

  // MARK: - წარმოებული

  get alive(): Player[] {
    return this.players.filter((p) => (this.lives[p.id] ?? 0) > 0);
  }
  get currentPlayer(): Player | null {
    const alive = this.alive;
    return alive[this.currentIndex] ?? alive[0] ?? null;
  }
  get victim(): Player | null {
    return this.players.find((p) => p.id === this.victimID) ?? null;
  }
  livesLeft(player: Player): number {
    return this.lives[player.id] ?? 0;
  }

  // MARK: - მიმდინარეობა

  startGame(): void {
    this.lives = Object.fromEntries(this.players.map((p) => [p.id, this.settings.lives]));
    this.round = 1;
    this.winner = null;
    this.victimID = null;
    this.currentIndex = 0;
    this.armFuse();
  }

  pass(): void {
    if (this.phase !== 'playing' || this.alive.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.alive.length;
    Haptics.tap();
    this.notify();
  }

  continueGame(): void {
    const survivors = this.alive;
    if (survivors.length <= 1) {
      this.winner = survivors[0] ?? null;
      this.phase = 'gameOver';
      this.notify();
      return;
    }
    this.round += 1;
    this.currentIndex = 0;
    this.armFuse();
  }

  restart(): void {
    this.startGame();
  }

  backToSetup(): void {
    this.ticker.stop();
    this.phase = 'setup';
    this.notify();
  }

  /** ეკრანიდან გასვლა — ტაიმერი უნდა გაჩერდეს, თორემ ფონში ტკაცუნებს. */
  abandon(): void {
    this.ticker.stop();
  }

  // MARK: - შიდა

  private armFuse(): void {
    const lo = Math.min(this.settings.minSeconds, this.settings.maxSeconds);
    const hi = Math.max(this.settings.minSeconds, this.settings.maxSeconds);
    this.fuse = lo + Math.random() * (hi - lo);
    this.elapsed = 0;
    this.tension = 0;
    this.nextTickAt = 0;
    this.victimID = null;
    this.category = (this.settings.categoryID ? WordBank.category(this.settings.categoryID) : undefined) ?? this.nextCategory();
    this.phase = 'playing';
    this.startTicker();
    this.notify();
  }

  private nextCategory(): WordCategory {
    const id = this.categoryShoe.draw();
    return (id ? WordBank.category(id) : undefined) ?? WordBank.randomCategory();
  }

  private startTicker(): void {
    this.ticker.start(0.05, () => {
      this.elapsed += 0.05;
      this.tension = Math.min(1, this.elapsed / this.fuse);

      if (this.elapsed >= this.nextTickAt) {
        if (this.tension > 0.75) {
          Haptics.tickHot();
          Sound.play('tickHot');
        } else {
          Haptics.tick();
          Sound.play('tick');
        }
        // ტკაცუნი თანდათან ხშირდება: 0.9წმ → 0.12წმ
        this.nextTickAt = this.elapsed + (0.9 - 0.78 * this.tension);
      }

      // ეკრანი ტკაცუნზე არაფერს კითხულობს — ხმა და ვიბრაცია ზემოთ უკვე წავიდა.
      if (this.elapsed >= this.fuse) this.explode();
    });
  }

  private explode(): void {
    this.ticker.stop();
    const victim = this.currentPlayer;
    if (!victim) return;
    this.victimID = victim.id;
    this.lives[victim.id] = Math.max(0, (this.lives[victim.id] ?? 0) - 1);
    this.phase = 'exploded';
    Haptics.boom();
    Sound.play('boom');
    this.notify();
  }

  // MARK: - პარამეტრები

  setLives(value: number): void {
    this.settings = { ...this.settings, lives: Math.min(Math.max(1, value), 5) };
    this.persist();
  }
  setRange(lo: number, hi: number): void {
    this.settings = { ...this.settings, minSeconds: lo, maxSeconds: hi };
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
