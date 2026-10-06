import { Observable } from '../../core/observable';
import { WideningShoe } from '../../core/wideningShoe';
import { shuffled } from '../../core/shuffle';
import { loadSettings, saveSettings, num, bool, categoryIDs, cleanCategoryIDs, discussionSeconds } from '../../core/settings';
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
  | 'discussion'    // აღწერები; კენჭისყრა მაგიდასთან, ხმამაღლა
  | 'caughtCheck'   // მაგიდამ იმპოსტორი დაიჭირა? (მხოლოდ ბოლო შანსით)
  | 'impostorGuess' // დაჭერილმა იმპოსტორმა სიტყვა უნდა გამოიცნოს
  | 'result';       // სიტყვა და ვინ იყო იმპოსტორი

export interface ImpostorSettings {
  impostorCount: number;
  /** იმპოსტორის ბარათზე კატეგორია ჩანს. ნაგულისხმევად ჩართულია. */
  impostorKnowsCategory: boolean;
  /** დაჭერილ იმპოსტორს სიტყვის გამოცნობის ბოლო შანსი აქვს. ნაგულისხმევად ჩართულია. */
  impostorCanGuess: boolean;
  /** მონიშნული კატეგორიები; `[]` — ყველა. */
  categoryIDs: string[];
  /** განხილვის ტაიმერი (წამი); `0` — ტაიმერის გარეშე. ნაგულისხმევად გამორთულია. */
  discussionTimer: number;
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
  categoryIDs: [],
  discussionTimer: 0,
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
  guessOptions: string[] = [];
  /** დაჭერილი იმპოსტორის ვარაუდი; `null` — ბოლო შანსი არ გამოუყენებია. */
  impostorGuess: string | null = null;
  /** მაგიდამ იმპოსტორი დაიჭირა? `null` — არ უკითხავს (ბოლო შანსი გამორთულია). */
  caught: boolean | null = null;

  /** დასტები კატეგორიების მიხედვით — გასაღები კონტენტისაა, არა თამაშისა. */
  private shoes: Record<string, WideningShoe> = {};

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<ImpostorSettings>(KEY, DEFAULTS, (s) => ({
      impostorCount: num(s.impostorCount, DEFAULTS.impostorCount, 1, 6),
      impostorKnowsCategory: bool(s.impostorKnowsCategory, DEFAULTS.impostorKnowsCategory),
      impostorCanGuess: bool(s.impostorCanGuess, DEFAULTS.impostorCanGuess),
      categoryIDs: categoryIDs(s, (id) => WordBank.category(id) !== undefined),
      discussionTimer: discussionSeconds(s.discussionTimer, DEFAULTS.discussionTimer),
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

  /** ვინ მოიგო: დაიჭირეს და ვერ გამოიცნო — ჯგუფმა; სხვა შემთხვევაში იმპოსტორმა. `null` — უცნობია. */
  get winner(): 'group' | 'impostor' | null {
    if (this.phase !== 'result' || this.caught === null) return null;
    return this.caught && !this.guessedRight ? 'group' : 'impostor';
  }

  /** ვარაუდი გაკეთდა და სწორია. */
  get guessedRight(): boolean {
    return this.impostorGuess !== null && this.impostorGuess === this.secretWord;
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

  // MARK: - რაუნდის მიმდინარეობა

  startRound(): void {
    this.clampSettings();
    // ყოველ რაუნდზე შემთხვევითი კატეგორია მონიშნულებიდან (არაფერი მონიშნული — ყველადან).
    this.category = WordBank.randomCategory(this.settings.categoryIDs);
    this.secretWord = this.drawWord(this.category);
    // კატეგორია ამოიწურა და სიტყვა ბანკიდან მოვიდა — მინიშნება სიტყვის
    // ნამდვილი კატეგორიიდან უნდა იყოს, თორემ იმპოსტორს შეცდომაში შეიყვანს.
    if (!this.category.words.includes(this.secretWord)) {
      this.category = WordBank.categories.find((c) => c.words.includes(this.secretWord)) ?? this.category;
    }

    this.impostorIDs = new Set(shuffled(this.players).slice(0, this.settings.impostorCount).map((p) => p.id));
    // იმპოსტორი არასდროს იწყებს — სიტყვის გარეშე პირველი მინიშნება მაშინვე გასცემს.
    const civilians = this.players.filter((p) => !this.impostorIDs.has(p.id));
    const starters = civilians.length > 0 ? civilians : this.players;
    this.startingPlayerID = starters[Math.floor(Math.random() * starters.length)]?.id ?? null;

    this.revealIndex = 0;
    this.guessOptions = [];
    this.impostorGuess = null;
    this.caught = null;

    this.phase = 'reveal';
    this.notify();
  }

  advanceReveal(): void {
    if (this.revealIndex + 1 < this.players.length) this.revealIndex += 1;
    else this.phase = 'discussion';
    this.notify();
  }

  /** განხილვა და კენჭისყრა მაგიდასთან დასრულდა — ვაჩვენებთ სიტყვას და იმპოსტორებს. */
  showResult(): void {
    if (this.phase !== 'discussion') return;
    // ბოლო შანსი ჩართულია — ჯერ ვკითხულობთ, დაიჭირეს თუ არა, სიტყვა ჯერ არ ჩანს.
    this.phase = this.settings.impostorCanGuess ? 'caughtCheck' : 'result';
    this.notify();
  }

  /** მაგიდამ იმპოსტორი დაიჭირა — ტელეფონი მას გადაეცემა ბოლო შანსისთვის. */
  impostorCaught(): void {
    if (this.phase !== 'caughtCheck') return;
    this.caught = true;
    this.guessOptions = this.makeGuessOptions();
    this.phase = 'impostorGuess';
    this.notify();
  }

  /** ვერ დაიჭირეს — პირდაპირ პასუხზე. */
  impostorNotCaught(): void {
    if (this.phase !== 'caughtCheck') return;
    this.caught = false;
    this.phase = 'result';
    this.notify();
  }

  submitGuess(word: string): void {
    if (this.phase !== 'impostorGuess') return;
    this.impostorGuess = word;
    this.phase = 'result';
    this.notify();
  }

  nextRound(): void {
    if (this.phase !== 'result') return;
    this.round += 1;
    this.startRound();
  }

  backToSetup(): void {
    this.phase = 'setup';
    this.notify();
  }

  /** ცხრა მცდარი ვარიანტი (რამდენიც კატეგორიაში მოიძებნება) + სწორი, არეული. */
  private makeGuessOptions(): string[] {
    const others = shuffled(this.category.words.filter((w) => w !== this.secretWord)).slice(0, 9);
    return shuffled([...others, this.secretWord]);
  }

  private drawWord(category: WordCategory): string {
    const key = `word.${category.id}`;
    // კატეგორია ამოიწურა? სიტყვა მთელი ბანკიდან მოდის, არა თავიდან არეული იგივე ორმოციდან.
    const shoe = this.shoes[key] ?? new WideningShoe(key, category.words, 'word.all', WordBank.all);
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
  /** 0 = ტაიმერის გარეშე („∞“) — `DiscussionPanel` ამას იცნობს. */
  setDiscussionSeconds(value: number): void {
    this.settings = { ...this.settings, discussionTimer: discussionSeconds(value, DEFAULTS.discussionTimer) };
    this.persist();
  }
  setCategories(ids: string[]): void {
    this.settings = {
      ...this.settings,
      categoryIDs: cleanCategoryIDs(ids, (id) => WordBank.category(id) !== undefined),
    };
    this.persist();
  }

  private persist(): void {
    saveSettings(KEY, this.settings);
    this.notify();
  }
}
