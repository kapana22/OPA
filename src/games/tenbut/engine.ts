import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { loadSettings, saveSettings, categoryIDs, cleanCategoryIDs, selectionKey } from '../../core/settings';
import { TenButBank } from '../../content/banks';
import type { Player } from '../../core/roster';

/**
 * „10-ია, მაგრამ...“ — ეკრანზე ჩვევა და ვისი ჯერია. დანარჩენი მაგიდაზეა:
 * ყველა თითებით აჩვენებს შეფასებას და იმსჯელებენ. ტელეფონი მხოლოდ
 * ბარათს აჩვენებს და „შემდეგს“ — ქულები არ არის.
 */

export type TenButPhase = 'setup' | 'card' | 'summary';

export interface TenButSettings {
  /** მონიშნული კატეგორიები; `[]` — ყველა. */
  categoryIDs: string[];
}

const KEY = 'splash.tenbut.settings.v2'; // v1 ცალობით რაუნდს ინახავდა
const DEFAULTS: TenButSettings = { categoryIDs: [] };

export class TenButEngine extends Observable {
  readonly players: Player[];
  settings: TenButSettings;

  phase: TenButPhase = 'setup';
  round = 1;
  currentFlaw = '';
  targetIndex = 0;

  private shoe = new ContentShoe('tenbut.all', []);

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<TenButSettings>(KEY, DEFAULTS, (s) => ({
      categoryIDs: categoryIDs(s, (id) => TenButBank.category(id) !== undefined),
    }));
  }

  get target(): Player | null {
    if (this.players.length === 0) return null;
    return this.players[this.targetIndex % this.players.length] ?? null;
  }

  startGame(): void {
    this.shoe = new ContentShoe(
      `tenbut.${selectionKey(this.settings.categoryIDs)}`,
      TenButBank.deck(this.settings.categoryIDs),
    );
    this.round = 1;
    this.targetIndex = 0;
    this.loadFlaw();
  }

  /** შემდეგი ბარათი — ლიმიტი არ არის, მაგიდა თვითონ ასრულებს. */
  next(): void {
    if (this.phase !== 'card') return;
    this.round += 1;
    this.targetIndex += 1;
    this.loadFlaw();
  }

  finish(): void {
    if (this.phase !== 'card') return;
    this.phase = 'summary';
    this.notify();
  }

  swapFlaw(): void {
    if (this.phase !== 'card') return;
    this.loadFlaw();
  }
  restart(): void {
    this.startGame();
  }
  backToSetup(): void {
    this.phase = 'setup';
    this.notify();
  }

  private loadFlaw(): void {
    this.currentFlaw = this.shoe.draw() ?? '—';
    this.phase = 'card';
    this.notify();
  }

  setCategories(ids: string[]): void {
    this.settings = {
      ...this.settings,
      categoryIDs: cleanCategoryIDs(ids, (id) => TenButBank.category(id) !== undefined),
    };
    this.persist();
  }

  private persist(): void {
    saveSettings(KEY, this.settings);
    this.notify();
  }
}
