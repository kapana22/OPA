import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { loadSettings, saveSettings, num, categoryID } from '../../core/settings';
import { NeverBank } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import type { Player } from '../../core/roster';

/**
 * „მე არასდროს...“ — დებულება ეკრანზეა, ვისაც სცოდნია, სიცოცხლეს კარგავს.
 *
 * პორტი: `Splash/Games/Never/NeverEngine.swift`.
 */

export type NeverPhase = 'setup' | 'round' | 'summary';

export interface NeverSettings {
  startingLives: number;
  categoryID: string | null;
}

const KEY = 'splash.never.settings.v1';
const DEFAULTS: NeverSettings = { startingLives: 3, categoryID: null };
/** რაუნდების ჭერი — დასტა უფრო დიდიც რომ იყოს, საღამო უსასრულო არ უნდა გახდეს. */
const ROUND_CAP = 20;

export class NeverEngine extends Observable {
  readonly players: Player[];
  settings: NeverSettings;

  phase: NeverPhase = 'setup';
  round = 1;
  currentStatement = '';

  lives: Record<string, number> = {};
  /** ვინ მონიშნა თავი ამ რაუნდში. */
  marked = new Set<string>();
  /** ვინ როდის ამოვარდა — ფრეს რეიტინგში ეს არღვევს. */
  outOrder: string[] = [];

  private shoe = new ContentShoe('never.all', []);
  private poolSize = 0;

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<NeverSettings>(KEY, DEFAULTS, (s) => ({
      startingLives: num(s.startingLives, DEFAULTS.startingLives, 1, 9),
      categoryID: categoryID(s.categoryID, (id) => NeverBank.category(id) !== undefined),
    }));
  }

  // MARK: - წარმოებული მნიშვნელობები

  get totalRounds(): number {
    return Math.max(1, Math.min(ROUND_CAP, this.poolSize));
  }
  get alive(): Player[] {
    return this.players.filter((p) => (this.lives[p.id] ?? 0) > 0);
  }

  livesLeft(player: Player): number {
    return this.lives[player.id] ?? 0;
  }
  isOut(player: Player): boolean {
    return this.livesLeft(player) === 0;
  }
  isMarked(player: Player): boolean {
    return this.marked.has(player.id);
  }
  /** ამოვარდნილს მონიშვნა აღარ შეუძლია — თუ უკვე მონიშნულია, გადაბრუნება კი შეიძლება. */
  canTap(player: Player): boolean {
    return this.livesLeft(player) > 0 || this.marked.has(player.id);
  }

  get eliminatedThisRound(): Player[] {
    return this.players.filter((p) => this.marked.has(p.id) && (this.lives[p.id] ?? 0) === 0);
  }

  get isFinalRound(): boolean {
    return this.alive.length <= 1 || this.round >= this.totalRounds;
  }

  get ranking(): Player[] {
    return [...this.players].sort((x, y) => {
      const a = this.lives[x.id] ?? 0;
      const b = this.lives[y.id] ?? 0;
      if (a !== b) return b - a;
      const oa = this.outIndex(x.id);
      const ob = this.outIndex(y.id);
      if (oa !== ob) return ob - oa;
      return x.name.localeCompare(y.name, 'ka');
    });
  }

  get topLives(): number {
    const values = Object.values(this.lives);
    return values.length > 0 ? Math.max(...values) : 0;
  }

  get winners(): Player[] {
    if (this.topLives <= 0) return [];
    return this.ranking.filter((p) => this.livesLeft(p) === this.topLives);
  }

  /** შეჯამებისთვის — დარჩენილი სიცოცხლე ქულაა. */
  get results(): { player: Player; score: number }[] {
    return this.players.map((p) => ({ player: p, score: this.livesLeft(p) }));
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    const pool = NeverBank.deck(this.settings.categoryID);
    this.poolSize = pool.length;
    this.shoe = new ContentShoe(`never.${this.settings.categoryID ?? 'all'}`, pool);
    this.round = 1;
    this.marked = new Set();
    this.outOrder = [];
    this.lives = Object.fromEntries(this.players.map((p) => [p.id, this.settings.startingLives]));

    this.drawStatement();
    this.phase = 'round';
    this.notify();
  }

  toggle(player: Player): void {
    if (this.phase !== 'round' || !this.canTap(player)) return;

    if (this.marked.has(player.id)) {
      this.marked.delete(player.id);
      this.lives[player.id] = (this.lives[player.id] ?? 0) + 1;
      this.outOrder = this.outOrder.filter((id) => id !== player.id);
      Haptics.tap();
    } else {
      this.marked.add(player.id);
      this.lives[player.id] = (this.lives[player.id] ?? 0) - 1;
      if (this.lives[player.id] === 0) {
        this.outOrder.push(player.id);
        Haptics.error();
      } else {
        Haptics.medium();
      }
    }
    this.notify();
  }

  skipStatement(): void {
    if (this.phase !== 'round') return;
    this.drawStatement();
    this.notify();
  }

  next(): void {
    this.marked = new Set();
    if (this.isFinalRound) {
      this.phase = 'summary';
      Haptics.success();
      this.notify();
      return;
    }
    this.round += 1;
    this.drawStatement();
    this.notify();
  }

  restart(): void {
    this.startGame();
  }
  backToSetup(): void {
    this.phase = 'setup';
    this.notify();
  }

  // MARK: - შიდა

  private outIndex(id: string): number {
    const i = this.outOrder.indexOf(id);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  }

  private drawStatement(): void {
    this.currentStatement = this.shoe.draw() ?? '—';
  }

  // MARK: - პარამეტრები

  setLives(value: number): void {
    this.settings = { ...this.settings, startingLives: Math.min(Math.max(1, value), 9) };
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
