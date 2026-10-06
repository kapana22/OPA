import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { shuffled } from '../../core/shuffle';
import { loadSettings, saveSettings, num, bool, categoryIDs, cleanCategoryIDs, selectionKey, discussionSeconds } from '../../core/settings';
import { PairBank } from '../../content/banks';
import type { Player } from '../../core/roster';

/**
 * „სხვა სიტყვა“ (Undercover) — უმრავლესობას ერთი სიტყვა აქვს, ერთს მსგავსი,
 * მაგრამ სხვა. **ჯაშუშმა თვითონაც არ იცის, რომ ჯაშუშია** — ბარათი მოქალაქისას
 * არაფრით არ განსხვავდება.
 *
 * პორტი: `Splash/Games/Spy/SpyEngine.swift`.
 */

export type SpyRole = 'civilian' | 'undercover' | 'mrWhite';

export type SpyPhase =
  | 'setup'
  | 'reveal'        // ტელეფონის გადაცემა
  | 'discussion'    // აღწერების წრე
  | 'voting'        // ვის ვაძევებთ — ტელეფონმა როლი უნდა გამოაჩინოს
  | 'mrWhiteGuess'  // გაძევებულ მისტერ უაითს ბოლო შანსი აქვს
  | 'roundResult'
  | 'gameOver';

export type SpyWinner = 'civilians' | 'undercovers' | 'mrWhite';

export interface SpySettings {
  undercoverCount: number;
  /** ერთ მოთამაშეს სიტყვა საერთოდ არ აქვს. ნაგულისხმევად გამორთულია. */
  includeMrWhite: boolean;
  /** მონიშნული კატეგორიები; `[]` — ყველა. */
  categoryIDs: string[];
  /** განხილვის ტაიმერი (წამი); `0` — ტაიმერის გარეშე. ნაგულისხმევად გამორთულია. */
  discussionTimer: number;
}

export interface SpyCard {
  word: string;
  note: string | null;
  isSpecial: boolean;
}

const KEY = 'splash.spy.settings.v1';
const DEFAULTS: SpySettings = { undercoverCount: 1, includeMrWhite: false, categoryIDs: [], discussionTimer: 0 };
/** რამდენ ბოლო წყვილს ვუვლით გვერდს, რომ საერთო სიტყვა არ გამეორდეს. */
const SIMILARITY_WINDOW = 6;

export class SpyEngine extends Observable {
  readonly players: Player[];
  settings: SpySettings;

  phase: SpyPhase = 'setup';
  turn = 1;

  roles: Record<string, SpyRole> = {};
  eliminated = new Set<string>();

  civilianWord = '';
  undercoverWord = '';
  categoryLabel = '';
  /** წყვილის კატეგორიის ყველა სიტყვა — მისტერ უაითის ვარიანტებისთვის. */
  private categoryWords: string[] = [];

  revealIndex = 0;
  startingPlayerID: string | null = null;
  lastEliminatedID: string | null = null;
  winner: SpyWinner | null = null;

  mrWhiteOptions: string[] = [];
  mrWhiteGuess: string | null = null;

  /**
   * მომხმარებლის არჩეული ჯაშუშების რაოდენობა. მისტერ უაითის ჩართვა ლიმიტს
   * ამცირებს; გამორთვისას არჩეული რიცხვი ბრუნდება.
   */
  private wantedUndercovers: number;

  private shoes: Record<string, ContentShoe> = {};

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<SpySettings>(KEY, DEFAULTS, (s) => ({
      undercoverCount: num(s.undercoverCount, DEFAULTS.undercoverCount, 1, 6),
      includeMrWhite: bool(s.includeMrWhite, DEFAULTS.includeMrWhite),
      categoryIDs: categoryIDs(s, (id) => PairBank.category(id) !== undefined),
      discussionTimer: discussionSeconds(s.discussionTimer, DEFAULTS.discussionTimer),
    }));
    this.wantedUndercovers = this.settings.undercoverCount;
    this.clampSettings();
  }

  // MARK: - წარმოებული მნიშვნელობები

  /**
   * ოთხზე მისტერ უაითი + ჯაშუში ორი ორზე იქნებოდა — პირველივე შეცდომა
   * თამაშს დაასრულებდა. ამიტომ მისტერ უაითს ხუთი მოთამაშე სჭირდება.
   */
  get canIncludeMrWhite(): boolean {
    return this.players.length >= 5;
  }

  /** ჯაშუშები (მისტერ უაითის ჩათვლით) უმცირესობაში უნდა დარჩნენ. */
  private get maxSpecials(): number {
    return Math.max(1, Math.floor((this.players.length - 1) / 2));
  }

  get maxUndercovers(): number {
    const reserved = this.settings.includeMrWhite && this.canIncludeMrWhite ? 1 : 0;
    return Math.max(1, this.maxSpecials - reserved);
  }

  get alive(): Player[] {
    return this.players.filter((p) => !this.eliminated.has(p.id));
  }
  get currentRevealPlayer(): Player | null {
    return this.players[this.revealIndex] ?? null;
  }
  get startingPlayer(): Player | null {
    return this.alive.find((p) => p.id === this.startingPlayerID) ?? null;
  }
  get lastEliminated(): Player | null {
    return this.players.find((p) => p.id === this.lastEliminatedID) ?? null;
  }

  roleOf(player: Player): SpyRole {
    return this.roles[player.id] ?? 'civilian';
  }
  playersWith(role: SpyRole): Player[] {
    return this.players.filter((p) => this.roles[p.id] === role);
  }

  card(player: Player): SpyCard {
    switch (this.roleOf(player)) {
      case 'civilian':
        return { word: this.civilianWord, note: null, isSpecial: false };
      case 'undercover':
        // ჯაშუშმა არ იცის, რომ ჯაშუშია — ბარათი მხოლოდ სიტყვით განსხვავდება.
        return { word: this.undercoverWord, note: null, isSpecial: false };
      case 'mrWhite':
        return { word: 'მისტერ უაითი ხარ', note: 'სიტყვა არ გაქვს. მოუსმინე და მოერგე.', isSpecial: true };
    }
  }

  // MARK: - პარამეტრების უსაფრთხო ცვლილება
  //
  // როლების რაოდენობა ერთმანეთზეა დამოკიდებული, ამიტომ UI პირდაპირ არ წერს
  // `settings`-ში — ამ მეთოდებს იძახებს და დიაპაზონი ყოველთვის ვალიდურია.

  setIncludeMrWhite(on: boolean): void {
    this.settings = { ...this.settings, includeMrWhite: on && this.canIncludeMrWhite };
    // გამორთვისას არჩეული რაოდენობა ბრუნდება, ჩართვისას ლიმიტში ჯდება.
    this.settings = { ...this.settings, undercoverCount: this.clampUndercovers(this.wantedUndercovers) };
    this.persist();
  }

  setUndercoverCount(count: number): void {
    this.wantedUndercovers = Math.max(1, Math.round(count));
    this.settings = { ...this.settings, undercoverCount: Math.min(Math.max(1, count), this.maxUndercovers) };
    this.persist();
  }

  /** 0 = ტაიმერის გარეშე („∞“) — `DiscussionPanel` ამას იცნობს. */
  setDiscussionSeconds(seconds: number): void {
    this.settings = { ...this.settings, discussionTimer: discussionSeconds(seconds, DEFAULTS.discussionTimer) };
    this.persist();
  }

  setCategories(ids: string[]): void {
    this.settings = {
      ...this.settings,
      categoryIDs: cleanCategoryIDs(ids, (id) => PairBank.category(id) !== undefined),
    };
    this.persist();
  }
  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    this.clampSettings();

    const { pair, category } = this.drawPair();
    this.categoryLabel = category.name;
    this.categoryWords = category.pairs.flatMap((p) => [p.a, p.b]);
    // შემთხვევით ვწყვეტთ, რომელი სიტყვა მიიღოს უმრავლესობამ.
    if (Math.random() < 0.5) {
      this.civilianWord = pair.a;
      this.undercoverWord = pair.b;
    } else {
      this.civilianWord = pair.b;
      this.undercoverWord = pair.a;
    }

    const pool = shuffled(this.players);
    this.roles = {};
    let i = 0;
    for (let n = 0; n < this.settings.undercoverCount && i < pool.length; n++) this.roles[pool[i++].id] = 'undercover';
    if (this.settings.includeMrWhite && this.canIncludeMrWhite && i < pool.length) this.roles[pool[i++].id] = 'mrWhite';
    for (; i < pool.length; i++) this.roles[pool[i].id] = 'civilian';

    this.eliminated = new Set();
    this.turn = 1;
    this.revealIndex = 0;
    this.lastEliminatedID = null;
    this.winner = null;
    this.mrWhiteGuess = null;
    this.mrWhiteOptions = [];
    this.startingPlayerID = this.pickStarter();

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

  eliminate(player: Player): void {
    if (this.phase !== 'voting') return;
    this.eliminated.add(player.id);
    // წინა რაუნდის მისტერ უაითის ვარაუდი ახალ შედეგზე აღარ უნდა ჩანდეს.
    this.mrWhiteGuess = null;
    this.lastEliminatedID = player.id;

    if (this.roleOf(player) === 'mrWhite') {
      this.mrWhiteOptions = this.makeMrWhiteOptions();
      this.phase = 'mrWhiteGuess';
    } else {
      this.phase = 'roundResult';
      this.evaluate();
    }
    this.notify();
  }

  /** გაძევებული მისტერ უაითი მოქალაქეების სიტყვას გამოიცნობს — სწორია და მარტო იგებს. */
  submitMrWhiteGuess(word: string): void {
    if (this.phase !== 'mrWhiteGuess') return;
    this.mrWhiteGuess = word;
    if (word === this.civilianWord) {
      this.finish('mrWhite');
    } else {
      this.phase = 'roundResult';
      this.evaluate();
    }
    this.notify();
  }

  continueGame(): void {
    if (this.winner !== null || this.phase !== 'roundResult') return;
    this.turn += 1;
    this.startingPlayerID = this.pickStarter();
    this.phase = 'discussion';
    this.notify();
  }

  restart(): void {
    this.startGame();
  }
  backToSetup(): void {
    this.phase = 'setup';
    this.notify();
  }

  // MARK: - გამარჯვების შემოწმება

  private evaluate(): void {
    // მისტერ უაითი ჯაშუშების მხარესაა: სანამ ცოცხალია, მოქალაქეებს ჯერ არ მოუგიათ.
    const specialsAlive = this.alive.filter((p) => this.roles[p.id] !== 'civilian').length;
    const civiliansAlive = this.alive.length - specialsAlive;

    if (specialsAlive === 0) this.finish('civilians');
    else if (specialsAlive >= civiliansAlive) this.finish('undercovers');
    // სხვა შემთხვევაში თამაში გრძელდება — `continueGame()` გადაიყვანს განხილვაზე.
  }

  private finish(result: SpyWinner): void {
    this.winner = result;
    this.phase = 'gameOver';
    this.notify();
  }

  // MARK: - წყვილის არჩევა

  private drawPair() {
    const key = `pair.${selectionKey(this.settings.categoryIDs)}`;
    const pool = PairBank.pairs(this.settings.categoryIDs).map((p) => `${p.a}|${p.b}`);
    const shoe = this.shoes[key] ?? new ContentShoe(key, pool);
    this.shoes[key] = shoe;

    // ბოლო წყვილების სიტყვები დაბლოკილია — თორემ „ყავა/ჩაი“-ს მერე
    // „ყავა/კაკაო“ მოვა და მაგიდას იგივე მოეჩვენება.
    const blocked = new Set(shoe.recent.slice(0, SIMILARITY_WINDOW).flatMap((id) => id.split('|')));
    const drawn = shoe.draw((id) => id.split('|').some((w) => blocked.has(w)));

    const found = drawn ? PairBank.pair(drawn, this.settings.categoryIDs) : undefined;
    if (found) return found;
    // დასტა ვერაფერს დააბრუნებს მხოლოდ მაშინ, თუ კატეგორია ცარიელია.
    return PairBank.randomPair(this.settings.categoryIDs);
  }

  /** მისტერ უაითი არასდროს იწყებს — სიტყვის გარეშე პირველი აღწერა მაშინვე გასცემს. */
  private pickStarter(): string | null {
    const alive = this.alive;
    const pool = alive.filter((p) => this.roles[p.id] !== 'mrWhite');
    const from = pool.length > 0 ? pool : alive;
    return from[Math.floor(Math.random() * from.length)]?.id ?? null;
  }

  /**
   * საერთო სიტყვა + ჯაშუშის სიტყვა + ოთხი იმავე კატეგორიიდან. სხვა
   * კატეგორიის სიტყვები მაშინვე გამოირიცხებოდა. კატეგორია მცირეა — ბანკიდან ვავსებთ.
   */
  private makeMrWhiteOptions(): string[] {
    const taken = new Set([this.civilianWord, this.undercoverWord]);
    const fromCategory = shuffled([...new Set(this.categoryWords)].filter((w) => !taken.has(w))).slice(0, 4);
    for (const w of fromCategory) taken.add(w);
    const filler = shuffled(PairBank.allWords.filter((w) => !taken.has(w))).slice(0, 4 - fromCategory.length);
    return shuffled([this.civilianWord, this.undercoverWord, ...fromCategory, ...filler]);
  }

  // MARK: - პარამეტრები

  private clampUndercovers(count: number): number {
    return Math.min(Math.max(1, count), this.maxUndercovers);
  }

  private clampSettings(): void {
    if (!this.canIncludeMrWhite) this.settings.includeMrWhite = false;
    this.settings.undercoverCount = this.clampUndercovers(this.settings.undercoverCount);
  }

  private persist(): void {
    saveSettings(KEY, this.settings);
    this.notify();
  }
}
