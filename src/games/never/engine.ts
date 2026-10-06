import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { loadSettings, saveSettings, num, categoryIDs, cleanCategoryIDs, selectionKey } from '../../core/settings';
import { NeverBank } from '../../content/banks';
import type { Player } from '../../core/roster';

/**
 * „მე არასდროს...“ — დებულება ეკრანზეა, ვისაც გაუკეთებია, თითს კეცავს.
 *
 * **ტელეფონი მხოლოდ დებულებებს აჩვენებს.** სიცოცხლე თითებზეა: ყველა
 * აწეული თითებით იწყებს და თვითონ კეცავს. ტელეფონი სახელებს და ქულებს
 * აღარ ითვლის — ეს საუბრის თამაშია, არა შეჯიბრი.
 *
 * პორტი: `Splash/Games/Never/NeverEngine.swift`.
 */

export type NeverPhase = 'setup' | 'round' | 'summary';

export interface NeverSettings {
  /** რამდენი აწეული თითით იწყებს თითოეული. */
  startingLives: number;
  /** მონიშნული კატეგორიები; `[]` — ყველა. */
  categoryIDs: string[];
}

const KEY = 'splash.never.settings.v1';
const DEFAULTS: NeverSettings = { startingLives: 5, categoryIDs: [] };

export class NeverEngine extends Observable {
  readonly players: Player[];
  settings: NeverSettings;

  phase: NeverPhase = 'setup';
  round = 1;
  currentStatement = '';

  private shoe = new ContentShoe('never.all', []);

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<NeverSettings>(KEY, DEFAULTS, (s) => ({
      startingLives: num(s.startingLives, DEFAULTS.startingLives, 1, 10),
      categoryIDs: categoryIDs(s, (id) => NeverBank.category(id) !== undefined),
    }));
  }

  // MARK: - წარმოებული მნიშვნელობები


  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    const pool = NeverBank.deck(this.settings.categoryIDs);
    this.shoe = new ContentShoe(`never.${selectionKey(this.settings.categoryIDs)}`, pool);
    this.round = 1;
    this.drawStatement();
    this.phase = 'round';
    this.notify();
  }

  skipStatement(): void {
    if (this.phase !== 'round') return;
    this.drawStatement();
    this.notify();
  }

  /** შემდეგი დებულება — ლიმიტი არ არის, მაგიდა თვითონ ასრულებს. */
  next(): void {
    if (this.phase !== 'round') return;
    this.round += 1;
    this.drawStatement();
    this.notify();
  }

  /** მაგიდამ ადრე დაასრულა — მაგალითად, ერთის მეტი აღარავის დარჩა თითი. */
  finish(): void {
    if (this.phase !== 'round') return;
    this.phase = 'summary';
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

  private drawStatement(): void {
    this.currentStatement = this.shoe.draw() ?? '—';
  }

  // MARK: - პარამეტრები

  setLives(value: number): void {
    this.settings = { ...this.settings, startingLives: Math.min(Math.max(1, value), 10) };
    this.persist();
  }
  setCategories(ids: string[]): void {
    this.settings = {
      ...this.settings,
      categoryIDs: cleanCategoryIDs(ids, (id) => NeverBank.category(id) !== undefined),
    };
    this.persist();
  }

  private persist(): void {
    saveSettings(KEY, this.settings);
    this.notify();
  }
}
