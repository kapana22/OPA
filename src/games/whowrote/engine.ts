import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { shuffled } from '../../core/shuffle';
import { loadSettings, saveSettings, categoryIDs, cleanCategoryIDs, selectionKey } from '../../core/settings';
import { AnswerPromptBank } from '../../content/banks';
import type { Player } from '../../core/roster';

/**
 * „ვინ დაწერა?“ — სასაუბრო თამაში: ყველა ფარულად წერს პასუხს, მერე ტელეფონი
 * ყველა პასუხს ერთად, არეულად და ანონიმურად აჩვენებს, მაგიდა კი ხმამაღლა
 * ცდილობს გამოიცნოს, ვინ რა დაწერა. ქულები და რაუნდები არ არის.
 *
 * პორტი: `Splash/Games/WhoWrote/WhoWroteEngine.swift`.
 */

export type WhoWrotePhase = 'setup' | 'intro' | 'write' | 'reading';
export type WhoWroteStage = 'handoff' | 'active';

export interface WhoWroteSettings {
  /** მონიშნული კატეგორიები; `[]` — ყველა. */
  categoryIDs: string[];
}

const KEY = 'splash.whowrote.settings.v1';
const DEFAULTS: WhoWroteSettings = { categoryIDs: [] };

export class WhoWroteEngine extends Observable {
  static readonly answerLimit = 70;

  readonly players: Player[];
  settings: WhoWroteSettings;

  phase: WhoWrotePhase = 'setup';
  stage: WhoWroteStage = 'handoff';
  currentPrompt = '';

  answers: Record<string, string> = {};
  writerIndex = 0;

  /** წასაკითხი სია — ერთხელ ირევა და მდგრადი რჩება. */
  readingList: string[] = [];

  private shoe = new ContentShoe('answerprompt.all', []);

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<WhoWroteSettings>(KEY, DEFAULTS, (s) => ({
      categoryIDs: categoryIDs(s, (id) => AnswerPromptBank.category(id) !== undefined),
    }));
  }

  // MARK: - წარმოებული მნიშვნელობები

  get canPlay(): boolean {
    return this.players.length >= 3;
  }

  get currentWriter(): Player | null {
    return this.players[this.writerIndex] ?? null;
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    this.shoe = new ContentShoe(
      `answerprompt.${selectionKey(this.settings.categoryIDs)}`,
      AnswerPromptBank.deck(this.settings.categoryIDs),
    );
    this.beginPrompt();
  }

  skipPrompt(): void {
    if (this.phase !== 'intro') return;
    this.loadPrompt();
    this.notify();
  }

  beginWriting(): void {
    if (this.phase !== 'intro') return;
    this.writerIndex = 0;
    this.stage = 'handoff';
    this.phase = 'write';
    this.notify();
  }

  /** ტელეფონი გადავიდა — ეკრანი იხსნება. */
  revealScreen(): void {
    if (this.phase !== 'write') return;
    this.stage = 'active';
    this.notify();
  }

  submitAnswer(text: string): boolean {
    // ორმაგი შეხება: მეორე დაჭერა შემდეგი მწერლის სახელით აღარ უნდა ჩაიწეროს.
    if (this.phase !== 'write' || this.stage !== 'active') return false;
    const trimmed = text.trim();
    const writer = this.currentWriter;
    if (!writer || !trimmed) return false;
    this.answers[writer.id] = trimmed.slice(0, WhoWroteEngine.answerLimit);

    if (this.writerIndex + 1 < this.players.length) {
      this.writerIndex += 1;
      this.stage = 'handoff';
    } else {
      this.readingList = shuffled(this.players.map((p) => this.answers[p.id]).filter((x): x is string => !!x));
      this.stage = 'handoff';
      this.phase = 'reading';
    }
    this.notify();
    return true;
  }

  /** წაკითხვის შემდეგ — ახალი დავალება და ისევ წერა. */
  next(): void {
    if (this.phase !== 'reading') return;
    this.beginPrompt();
  }

  backToSetup(): void {
    this.phase = 'setup';
    this.notify();
  }

  // MARK: - შიდა

  private beginPrompt(): void {
    this.answers = {};
    this.readingList = [];
    this.writerIndex = 0;
    this.stage = 'handoff';
    this.loadPrompt();
    this.phase = 'intro';
    this.notify();
  }

  private loadPrompt(): void {
    this.currentPrompt = this.shoe.draw() ?? '—';
  }

  // MARK: - პარამეტრები

  setCategories(ids: string[]): void {
    this.settings = {
      ...this.settings,
      categoryIDs: cleanCategoryIDs(ids, (id) => AnswerPromptBank.category(id) !== undefined),
    };
    this.persist();
  }

  private persist(): void {
    saveSettings(KEY, this.settings);
    this.notify();
  }
}
