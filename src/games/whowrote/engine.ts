import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { shuffled } from '../../core/shuffle';
import { loadSettings, saveSettings, num, categoryID } from '../../core/settings';
import { AnswerPromptBank } from '../../content/banks';
import type { Player } from '../../core/roster';

/**
 * „ვინ დაწერა?“ — ყველა წერს, ერთად კითხულობთ, იპოვე ავტორი.
 *
 * **წაკითხვის ეტაპი** განზრახ დგას წერასა და გამოცნობას შორის: ჯერ ყველა
 * პასუხი ხმამაღლა იკითხება, მერე იწყება გამოცნობა.
 *
 * პორტი: `Splash/Games/WhoWrote/WhoWroteEngine.swift`.
 */

export type WhoWrotePhase = 'setup' | 'intro' | 'write' | 'reading' | 'guess' | 'result' | 'summary';
export type WhoWroteStage = 'handoff' | 'active';

export interface WhoWroteSettings {
  rounds: number;
  categoryID: string | null;
}

export interface Reveal {
  id: string;
  answer: string;
  authorName: string;
  guesserName: string;
  pickedName: string;
  correct: boolean;
}

const KEY = 'splash.whowrote.settings.v1';
const DEFAULTS: WhoWroteSettings = { rounds: 5, categoryID: null };

export class WhoWroteEngine extends Observable {
  static readonly answerLimit = 70;

  readonly players: Player[];
  settings: WhoWroteSettings;

  phase: WhoWrotePhase = 'setup';
  stage: WhoWroteStage = 'handoff';
  round = 1;
  currentPrompt = '';

  answers: Record<string, string> = {};
  writerIndex = 0;

  /** გამომცნობი → ავტორი, ვისი პასუხიც მას ერგო. */
  assignment: Record<string, string> = {};
  guesses: Record<string, string> = {};
  guesserIndex = 0;

  /** წასაკითხი სია — ერთხელ ირევა და მდგრადი რჩება. */
  readingList: string[] = [];

  reveals: Reveal[] = [];
  roundPointsMap: Record<string, number> = {};
  totals: Record<string, number> = {};

  private shoe = new ContentShoe('answerprompt.all', []);

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<WhoWroteSettings>(KEY, DEFAULTS, (s) => ({
      rounds: num(s.rounds, DEFAULTS.rounds, 3, 7),
      categoryID: categoryID(s.categoryID, (id) => AnswerPromptBank.category(id) !== undefined),
    }));
  }

  // MARK: - წარმოებული მნიშვნელობები

  get canPlay(): boolean {
    return this.players.length >= 3;
  }
  get isLastRound(): boolean {
    return this.round >= this.settings.rounds;
  }

  get currentWriter(): Player | null {
    return this.players[this.writerIndex] ?? null;
  }
  get currentGuesser(): Player | null {
    return this.players[this.guesserIndex] ?? null;
  }

  get answerToGuess(): string {
    const guesser = this.currentGuesser;
    if (!guesser) return '';
    const authorID = this.assignment[guesser.id];
    return authorID ? (this.answers[authorID] ?? '') : '';
  }

  get guessOptions(): Player[] {
    const guesser = this.currentGuesser;
    return guesser ? this.players.filter((p) => p.id !== guesser.id) : [];
  }

  player(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }
  totalFor(player: Player): number {
    return this.totals[player.id] ?? 0;
  }
  roundPoints(player: Player): number {
    return this.roundPointsMap[player.id] ?? 0;
  }

  get ranking(): Player[] {
    return [...this.players].sort((x, y) => {
      const a = this.totals[x.id] ?? 0;
      const b = this.totals[y.id] ?? 0;
      return a !== b ? b - a : x.name.localeCompare(y.name, 'ka');
    });
  }

  get results(): { player: Player; score: number }[] {
    return this.players.map((p) => ({ player: p, score: this.totalFor(p) }));
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    this.shoe = new ContentShoe(
      `answerprompt.${this.settings.categoryID ?? 'all'}`,
      AnswerPromptBank.deck(this.settings.categoryID),
    );
    this.round = 1;
    this.totals = {};
    this.beginRound();
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
    if (this.phase !== 'write' && this.phase !== 'guess') return;
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
      this.dealAnswers();
      this.readingList = shuffled(this.players.map((p) => this.answers[p.id]).filter((x): x is string => !!x));
      this.guesserIndex = 0;
      this.stage = 'handoff';
      this.phase = 'reading';
    }
    this.notify();
    return true;
  }

  beginGuessing(): void {
    if (this.phase !== 'reading') return;
    this.guesserIndex = 0;
    this.stage = 'handoff';
    this.phase = 'guess';
    this.notify();
  }

  submitGuess(target: Player): void {
    // ორმაგი შეხება ბოლო გამომცნობზე რაუნდს ორჯერ დაითვლიდა.
    if (this.phase !== 'guess' || this.stage !== 'active') return;
    const guesser = this.currentGuesser;
    if (!guesser || target.id === guesser.id || !this.player(target.id)) return;
    this.guesses[guesser.id] = target.id;

    if (this.guesserIndex + 1 < this.players.length) {
      this.guesserIndex += 1;
      this.stage = 'handoff';
    } else {
      this.finishRound();
    }
    this.notify();
  }

  next(): void {
    if (this.phase !== 'result') return;
    if (this.isLastRound) {
      this.phase = 'summary';
      this.notify();
    } else {
      this.round += 1;
      this.beginRound();
    }
  }

  restart(): void {
    this.startGame();
  }
  backToSetup(): void {
    this.phase = 'setup';
    this.notify();
  }

  // MARK: - შიდა

  private beginRound(): void {
    this.answers = {};
    this.assignment = {};
    this.guesses = {};
    this.readingList = [];
    this.reveals = [];
    this.roundPointsMap = {};
    this.writerIndex = 0;
    this.guesserIndex = 0;
    this.stage = 'handoff';
    this.loadPrompt();
    this.phase = 'intro';
    this.notify();
  }

  private loadPrompt(): void {
    this.currentPrompt = this.shoe.draw() ?? '—';
  }

  /** წრე: თითოეულს მეზობლის პასუხი ხვდება — საკუთარი არავის. */
  private dealAnswers(): void {
    const circle = shuffled(this.players);
    if (circle.length <= 1) {
      this.assignment = {};
      return;
    }
    const map: Record<string, string> = {};
    circle.forEach((player, i) => {
      map[player.id] = circle[(i + 1) % circle.length].id;
    });
    this.assignment = map;
  }

  private finishRound(): void {
    const points: Record<string, number> = {};
    const list: Reveal[] = [];

    for (const author of this.players) {
      const answer = this.answers[author.id];
      const guesser = this.players.find((p) => this.assignment[p.id] === author.id);
      if (answer === undefined || !guesser) continue;

      const picked = this.guesses[guesser.id];
      const correct = picked === author.id;
      // გამოიცნო — ქულა გამომცნობს; ვერ იცნეს — ავტორს.
      const winnerID = correct ? guesser.id : author.id;
      points[winnerID] = (points[winnerID] ?? 0) + 2;

      list.push({
        id: author.id,
        answer,
        authorName: author.name,
        guesserName: guesser.name,
        pickedName: (picked ? this.player(picked)?.name : undefined) ?? '—',
        correct,
      });
    }

    this.roundPointsMap = points;
    for (const [id, value] of Object.entries(points)) this.totals[id] = (this.totals[id] ?? 0) + value;
    this.reveals = list;
    this.phase = 'result';
  }

  // MARK: - პარამეტრები

  setRounds(count: number): void {
    this.settings = { ...this.settings, rounds: Math.min(Math.max(3, count), 7) };
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
