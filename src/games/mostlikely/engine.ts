import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { loadSettings, saveSettings, categoryIDs, cleanCategoryIDs, selectionKey } from '../../core/settings';
import { PromptBank } from '../../content/banks';
import type { Player } from '../../core/roster';

/**
 * „ვინ არის ყველაზე...“ — ეკრანზე კითხვაა, მაგიდა ერთდროულად უთითებს.
 *
 * ტელეფონი მხოლოდ კითხვას აჩვენებს. ქულები და სახელების მონიშვნა არ არის —
 * ეს საუბრის თამაშია. Point at One-ის კითხვებიც აქაა (`PromptBank`).
 *
 * პორტი: `Splash/Games/MostLikely/MostLikelyEngine.swift`.
 */

export type MostLikelyPhase = 'setup' | 'prompt' | 'summary';

export interface MostLikelySettings {
  /** მონიშნული კატეგორიები; `[]` — ყველა. */
  categoryIDs: string[];
}

const SETTINGS_KEY = 'splash.mostlikely.settings.v1';
const DEFAULTS: MostLikelySettings = { categoryIDs: [] };

export class MostLikelyEngine extends Observable {
  readonly players: Player[];
  settings: MostLikelySettings = { ...DEFAULTS };

  phase: MostLikelyPhase = 'setup';
  round = 1;
  currentPrompt = '';

  /**
   * დებულებების დასტა — ადრე ყოველ პარტიაზე ნულიდან ირეოდა, ამიტომ ერთი და
   * იგივე კითხვა საღამოში სამჯერ ჩნდებოდა. ახლა მეხსიერება რჩება.
   */
  private shoe = new ContentShoe('prompt.all', []);

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.loadSettings();
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    this.shoe = new ContentShoe(
      `prompt.${selectionKey(this.settings.categoryIDs)}`,
      PromptBank.deck(this.settings.categoryIDs),
    );
    this.round = 1;
    this.loadPrompt();
  }

  /** შემდეგი კითხვა — ლიმიტი არ არის, მაგიდა თვითონ ასრულებს. */
  next(): void {
    if (this.phase !== 'prompt') return;
    this.round += 1;
    this.loadPrompt();
  }

  finish(): void {
    if (this.phase !== 'prompt') return;
    this.phase = 'summary';
    this.notify();
  }

  /** კითხვა არ მოგვწონს — ვცვლით რაუნდის დახარჯვის გარეშე. */
  skipPrompt(): void {
    if (this.phase !== 'prompt') return;
    this.loadPrompt();
  }

  restart(): void {
    this.startGame();
  }
  backToSetup(): void {
    this.phase = 'setup';
    this.notify();
  }

  // MARK: - შიდა

  private loadPrompt(): void {
    // დასტა ამოიწურა — თავიდან ვურევთ.
    this.currentPrompt = this.shoe.draw() ?? '—';
    this.phase = 'prompt';
    this.notify();
  }

  // MARK: - პარამეტრები

  setCategories(ids: string[]): void {
    this.settings = {
      ...this.settings,
      categoryIDs: cleanCategoryIDs(ids, (id) => PromptBank.category(id) !== undefined),
    };
    this.saveSettings();
  }

  private saveSettings(): void {
    saveSettings(SETTINGS_KEY, this.settings);
    this.notify();
  }

  /** წაშლილი კატეგორია ვერ გავა. */
  private loadSettings(): void {
    this.settings = loadSettings<MostLikelySettings>(SETTINGS_KEY, DEFAULTS, (s) => ({
      categoryIDs: categoryIDs(s, (id) => PromptBank.category(id) !== undefined),
    }));
  }
}
