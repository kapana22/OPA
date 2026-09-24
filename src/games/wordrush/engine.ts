import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { WideningShoe } from '../../core/wideningShoe';
import { Ticker } from '../../core/ticker';
import { loadSettings, saveSettings, num, categoryID } from '../../core/settings';
import { CharadesBank, type WordCategory } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import type { Player } from '../../core/roster';

/**
 * „სიტყვების რბოლა“ — ერთი კატეგორია, წამები, მრიცხველი.
 *
 * პორტი: `Splash/Games/WordRush/WordRushEngine.swift`.
 */

export type WordRushPhase = 'setup' | 'intro' | 'playing' | 'turnResult' | 'summary';

export interface WordRushSettings {
  seconds: number;
  rounds: number;
  categoryID: string | null;
}

const KEY = 'splash.wordrush.settings.v1';
const DEFAULTS: WordRushSettings = { seconds: 45, rounds: 1, categoryID: null };

export class WordRushEngine extends Observable {
  readonly players: Player[];
  settings: WordRushSettings;

  phase: WordRushPhase = 'setup';
  round = 1;
  turnIndex = 0;
  remaining = 0;
  turnCount = 0;
  categoryName = '';
  /** საწყისი სიტყვა — მხოლოდ ბიძგისთვის. */
  starter = '';
  /** ამ ჯერზე კატეგორია უკვე შეიცვალა — ერთზე მეტი ცვლა არ შეიძლება. */
  swappedThisTurn = false;

  totals: Record<string, number> = {};
  lastTurn: { player: Player; count: number } | null = null;

  private ticker = new Ticker();
  private categoryShoe: ContentShoe | null = null;

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<WordRushSettings>(KEY, DEFAULTS, (s) => ({
      seconds: num(s.seconds, DEFAULTS.seconds, 10, 180),
      rounds: num(s.rounds, DEFAULTS.rounds, 1, 5),
      categoryID: categoryID(s.categoryID, (id) => CharadesBank.category(id) !== undefined),
    }));
  }

  // MARK: - წარმოებული მნიშვნელობები

  get currentPlayer(): Player | null {
    return this.players[this.turnIndex] ?? null;
  }
  get isLastTurnOfRound(): boolean {
    return this.turnIndex + 1 >= this.players.length;
  }
  get isLastRound(): boolean {
    return this.round >= this.settings.rounds;
  }
  get isGameOver(): boolean {
    return this.isLastRound && this.isLastTurnOfRound;
  }

  totalFor(player: Player): number {
    return this.totals[player.id] ?? 0;
  }

  get ranking(): Player[] {
    return [...this.players].sort((x, y) => {
      const a = this.totals[x.id] ?? 0;
      const b = this.totals[y.id] ?? 0;
      return a !== b ? b - a : x.name.localeCompare(y.name, 'ka');
    });
  }

  get best(): Player | null {
    const top = this.ranking[0];
    return top && this.totalFor(top) > 0 ? top : null;
  }

  /** ფრეზე ყველა პირველი — `PodiumAward`-იც ყველას +3-ს აძლევს. */
  get champions(): Player[] {
    const best = this.best;
    if (!best) return [];
    const top = this.totalFor(best);
    return this.ranking.filter((p) => this.totalFor(p) === top);
  }

  /** სპორტული ადგილი: ერთნაირ ქულას ერთი ადგილი აქვს. */
  rankOf(player: Player): number {
    const score = this.totalFor(player);
    return 1 + this.players.filter((p) => this.totalFor(p) > score).length;
  }

  /** დარჩენილი დროის წილი — ეკრანის რკალისთვის. */
  get fraction(): number {
    return this.remaining / Math.max(1, this.settings.seconds);
  }

  get results(): { player: Player; score: number }[] {
    return this.players.map((p) => ({ player: p, score: this.totalFor(p) }));
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    this.totals = {};
    this.round = 1;
    this.turnIndex = 0;
    this.lastTurn = null;
    this.swappedThisTurn = false;
    this.loadCategory();
    this.phase = 'intro';
    this.notify();
  }

  beginTurn(): void {
    if (this.phase !== 'intro') return;
    this.turnCount = 0;
    this.remaining = this.settings.seconds;
    this.phase = 'playing';
    Haptics.medium();
    Sound.play('start');
    this.startTicker();
    this.notify();
  }

  count(): void {
    if (this.phase !== 'playing') return;
    this.turnCount += 1;
    Haptics.tap();
    Sound.play('correct');
    this.notify();
  }

  uncount(): void {
    if (this.phase !== 'playing' || this.turnCount <= 0) return;
    this.turnCount -= 1;
    Haptics.tap();
    Sound.play('wrong');
    this.notify();
  }

  endTurn(): void {
    // ორმაგი შეხება „დასრულებაზე“ ქულას მეორედ არ უნდა დაუმატებდეს.
    if (this.phase !== 'playing') return;
    this.ticker.stop();
    const player = this.currentPlayer;
    if (!player) {
      this.phase = 'summary';
      this.notify();
      return;
    }
    this.totals[player.id] = (this.totals[player.id] ?? 0) + this.turnCount;
    this.lastTurn = { player, count: this.turnCount };
    this.phase = 'turnResult';
    Haptics.boom();
    Sound.play('boom');
    this.notify();
  }

  next(): void {
    // ორმაგი შეხება მოთამაშეს არ უნდა გამოტოვებდეს.
    if (this.phase !== 'turnResult') return;
    if (this.isLastTurnOfRound) {
      if (this.isLastRound) {
        this.phase = 'summary';
        this.notify();
        return;
      }
      this.round += 1;
      this.turnIndex = 0;
    } else {
      this.turnIndex += 1;
    }
    this.swappedThisTurn = false;
    this.loadCategory();
    this.phase = 'intro';
    this.notify();
  }

  /** მხოლოდ შემთხვევით რეჟიმში აქვს აზრი — ფიქსირებული კატეგორია იგივე დარჩებოდა,
   *  სიტყვა კი საერთო დასტიდან (`word.<id>`) ტყუილად დაიხარჯებოდა.
   *  ჯერზე მხოლოდ ერთხელ — თორემ ყველა მსუბუქ კატეგორიამდე ცვლიდა და ქულები
   *  არათანაბარ დავალებებზე შედარდებოდა. */
  get canSwapCategory(): boolean {
    return this.settings.categoryID === null && !this.swappedThisTurn;
  }
  swapCategory(): void {
    if (!this.canSwapCategory || this.phase !== 'intro') return;
    this.swappedThisTurn = true;
    this.loadCategory();
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
  abandon(): void {
    this.ticker.stop();
  }

  // MARK: - შიდა

  private loadCategory(): void {
    const categories = CharadesBank.categories;
    let category: WordCategory | undefined;

    if (this.settings.categoryID) {
      category = categories.find((c) => c.id === this.settings.categoryID);
    } else {
      if (!this.categoryShoe) {
        this.categoryShoe = new ContentShoe('wordrush.category', categories.map((c) => c.id));
      }
      const id = this.categoryShoe.draw();
      category = (id ? categories.find((c) => c.id === id) : undefined) ?? categories[Math.floor(Math.random() * categories.length)];
    }
    this.categoryName = category?.name ?? 'სიტყვები';

    // საწყისი სიტყვა მხოლოდ ბიძგისთვისაა, მაგრამ გამეორება მაინც ეტყობა.
    // გასაღები საერთოა — შარადებში ნანახი სიტყვა აქაც არ დაბრუნდება.
    if (category) {
      const shoe = new WideningShoe(`word.${category.id}`, category.words, 'word.charades-all', CharadesBank.all);
      this.starter = shoe.draw() ?? '';
    } else {
      this.starter = '';
    }
  }

  private startTicker(): void {
    this.ticker.start(1, () => {
      if (this.remaining <= 0) {
        this.endTurn();
        return;
      }
      this.remaining -= 1;
      if (this.remaining === 0) {
        this.endTurn();
      } else if (this.remaining <= 5) {
        Haptics.tickHot();
        Sound.play('tickHot');
      }
      this.notify();
    });
  }

  // MARK: - პარამეტრები

  setSeconds(value: number): void {
    this.settings = { ...this.settings, seconds: Math.min(Math.max(10, value), 180) };
    this.persist();
  }
  setRounds(value: number): void {
    this.settings = { ...this.settings, rounds: Math.min(Math.max(1, value), 5) };
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
