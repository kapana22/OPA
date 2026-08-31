import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { shuffled } from '../../core/shuffle';
import { loadSettings, saveSettings, num, bool, categoryID } from '../../core/settings';
import { WordBank, type WordCategory } from '../../content/banks';
import type { Player } from '../../core/roster';

/**
 * „იმპოსტორი“ — ყველას ერთი საიდუმლო სიტყვა აქვს, ერთს არა. იპოვე ის.
 *
 * პორტი: `Splash/Games/Impostor/ImpostorEngine.swift`.
 */

export type ImpostorPhase =
  | 'setup'         // პარამეტრები და კატეგორია
  | 'reveal'        // ტელეფონის გადაცემა, როლის ნახვა
  | 'discussion'    // აღწერები + ტაიმერი
  | 'voting'        // ვინ არის იმპოსტორი?
  | 'impostorGuess' // დაჭერილმა იმპოსტორმა სიტყვა უნდა გამოიცნოს
  | 'result';

export type ImpostorOutcome =
  | 'impostorCaught'      // ჯგუფმა იპოვა და სიტყვაც ვერ გამოიცნო
  | 'impostorGuessedWord' // იპოვეს, მაგრამ სიტყვა გამოიცნო
  | 'impostorEscaped';    // ვერ იპოვეს

export interface ImpostorSettings {
  impostorCount: number;
  impostorKnowsCategory: boolean;
  impostorCanGuess: boolean;
  discussionSeconds: number;
  categoryID: string | null;
}

export interface ImpostorCard {
  word: string;
  isImpostor: boolean;
  hint: string | null;
}

const KEY = 'splash.impostor.settings.v1';
const DEFAULTS: ImpostorSettings = {
  impostorCount: 1,
  impostorKnowsCategory: true,
  impostorCanGuess: true,
  discussionSeconds: 180,
  categoryID: null,
};

export class ImpostorEngine extends Observable {
  readonly players: Player[];
  settings: ImpostorSettings;

  phase: ImpostorPhase = 'setup';
  round = 1;

  category: WordCategory = WordBank.categories[0];
  secretWord = '';
  impostorIDs = new Set<string>();

  revealIndex = 0;
  startingPlayerID: string | null = null;
  accusedID: string | null = null;
  outcome: ImpostorOutcome | null = null;
  guessOptions: string[] = [];
  impostorGuess: string | null = null;
  roundPoints: Record<string, number> = {};

  /** დასტები კატეგორიების მიხედვით — გასაღები კონტენტისაა, არა თამაშისა. */
  private shoes: Record<string, ContentShoe> = {};

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<ImpostorSettings>(KEY, DEFAULTS, (s) => ({
      impostorCount: num(s.impostorCount, DEFAULTS.impostorCount, 1, 6),
      impostorKnowsCategory: bool(s.impostorKnowsCategory, DEFAULTS.impostorKnowsCategory),
      impostorCanGuess: bool(s.impostorCanGuess, DEFAULTS.impostorCanGuess),
      discussionSeconds: num(s.discussionSeconds, DEFAULTS.discussionSeconds, 30, 600),
      categoryID: categoryID(s.categoryID, (id) => WordBank.category(id) !== undefined),
    }));
    this.clampSettings();
  }

  // MARK: - წარმოებული მნიშვნელობები

  /** იმპოსტორები უმცირესობაში უნდა დარჩნენ. */
  get maxImpostors(): number {
    return Math.max(1, Math.floor((this.players.length - 1) / 2));
  }
  get currentRevealPlayer(): Player | null {
    return this.players[this.revealIndex] ?? null;
  }
  get impostors(): Player[] {
    return this.players.filter((p) => this.impostorIDs.has(p.id));
  }
  get startingPlayer(): Player | null {
    return this.players.find((p) => p.id === this.startingPlayerID) ?? null;
  }
  get accused(): Player | null {
    return this.players.find((p) => p.id === this.accusedID) ?? null;
  }

  isImpostor(player: Player): boolean {
    return this.impostorIDs.has(player.id);
  }

  /** ბარათი, რომელსაც ეს მოთამაშე ხედავს. */
  card(player: Player): ImpostorCard {
    if (this.isImpostor(player)) {
      return {
        word: 'იმპოსტორი ხარ',
        isImpostor: true,
        hint: this.settings.impostorKnowsCategory ? this.category.name : null,
      };
    }
    return { word: this.secretWord, isImpostor: false, hint: this.category.name };
  }

  get results(): { player: Player; score: number }[] {
    return this.players.map((p) => ({ player: p, score: this.roundPoints[p.id] ?? 0 }));
  }

  // MARK: - რაუნდის მიმდინარეობა

  startRound(): void {
    this.clampSettings();
    this.category =
      (this.settings.categoryID ? WordBank.category(this.settings.categoryID) : undefined) ?? WordBank.randomCategory();
    this.secretWord = this.drawWord(this.category);

    this.impostorIDs = new Set(shuffled(this.players).slice(0, this.settings.impostorCount).map((p) => p.id));
    this.startingPlayerID = this.players[Math.floor(Math.random() * this.players.length)]?.id ?? null;

    this.revealIndex = 0;
    this.accusedID = null;
    this.outcome = null;
    this.impostorGuess = null;
    this.guessOptions = [];
    this.roundPoints = {};

    this.phase = 'reveal';
    this.notify();
  }

  advanceReveal(): void {
    if (this.revealIndex + 1 < this.players.length) this.revealIndex += 1;
    else this.phase = 'discussion';
    this.notify();
  }

  beginVoting(): void {
    this.phase = 'voting';
    this.notify();
  }

  accuse(player: Player): void {
    this.accusedID = player.id;

    if (!this.isImpostor(player)) {
      this.finish('impostorEscaped');
      return;
    }

    if (this.settings.impostorCanGuess) {
      this.guessOptions = this.makeGuessOptions();
      this.phase = 'impostorGuess';
      this.notify();
    } else {
      this.finish('impostorCaught');
    }
  }

  submitGuess(word: string): void {
    this.impostorGuess = word;
    this.finish(word === this.secretWord ? 'impostorGuessedWord' : 'impostorCaught');
  }

  nextRound(): void {
    this.round += 1;
    this.startRound();
  }

  backToSetup(): void {
    this.phase = 'setup';
    this.notify();
  }

  // MARK: - ქულები

  private finish(outcome: ImpostorOutcome): void {
    this.outcome = outcome;
    const points: Record<string, number> = {};

    if (outcome === 'impostorCaught') {
      for (const p of this.players) if (!this.isImpostor(p)) points[p.id] = 2;
    } else if (outcome === 'impostorGuessedWord') {
      for (const p of this.players) if (!this.isImpostor(p)) points[p.id] = 1;
      for (const p of this.impostors) points[p.id] = 2;
    } else {
      for (const p of this.impostors) points[p.id] = 3;
    }

    this.roundPoints = points;
    this.phase = 'result';
    this.notify();
  }

  /** ხუთი მცდარი ვარიანტი + სწორი, არეული. */
  private makeGuessOptions(): string[] {
    const others = shuffled(this.category.words.map((w) => w.text).filter((w) => w !== this.secretWord)).slice(0, 5);
    return shuffled([...others, this.secretWord]);
  }

  private drawWord(category: WordCategory): string {
    const key = `word.${category.id}`;
    const shoe = this.shoes[key] ?? new ContentShoe(key, category.words.map((w) => w.text));
    this.shoes[key] = shoe;
    return shoe.draw() ?? '—';
  }

  // MARK: - პარამეტრები

  private clampSettings(): void {
    this.settings.impostorCount = Math.min(Math.max(1, this.settings.impostorCount), this.maxImpostors);
  }

  setImpostorCount(value: number): void {
    this.settings = { ...this.settings, impostorCount: Math.min(Math.max(1, value), this.maxImpostors) };
    this.persist();
  }
  setKnowsCategory(value: boolean): void {
    this.settings = { ...this.settings, impostorKnowsCategory: value };
    this.persist();
  }
  setCanGuess(value: boolean): void {
    this.settings = { ...this.settings, impostorCanGuess: value };
    this.persist();
  }
  setDiscussionSeconds(value: number): void {
    this.settings = { ...this.settings, discussionSeconds: Math.min(Math.max(30, value), 600) };
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
