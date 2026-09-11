import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { shuffled } from '../../core/shuffle';
import { loadSettings, saveSettings, num, bool, categoryID } from '../../core/settings';
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
  | 'voting'        // ვის ვაძევებთ
  | 'mrWhiteGuess'  // გაძევებულ მისტერ უაითს ბოლო შანსი აქვს
  | 'roundResult'
  | 'gameOver';

export type SpyWinner = 'civilians' | 'undercovers' | 'mrWhite';

export interface SpySettings {
  undercoverCount: number;
  includeMrWhite: boolean;
  discussionSeconds: number;
  categoryID: string | null;
}

export interface SpyCard {
  word: string;
  note: string | null;
  isSpecial: boolean;
}

const KEY = 'splash.spy.settings.v1';
const DEFAULTS: SpySettings = { undercoverCount: 1, includeMrWhite: false, discussionSeconds: 120, categoryID: null };
/** განხილვის დრო წამებში; 0 = ტაიმერის გარეშე. */
const DISCUSSION = [30, 600] as const;
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

  revealIndex = 0;
  startingPlayerID: string | null = null;
  lastEliminatedID: string | null = null;
  winner: SpyWinner | null = null;

  mrWhiteOptions: string[] = [];
  mrWhiteGuess: string | null = null;
  finalPoints: Record<string, number> = {};

  private shoes: Record<string, ContentShoe> = {};

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<SpySettings>(KEY, DEFAULTS, (s) => ({
      undercoverCount: num(s.undercoverCount, DEFAULTS.undercoverCount, 1, 6),
      includeMrWhite: bool(s.includeMrWhite, DEFAULTS.includeMrWhite),
      discussionSeconds: s.discussionSeconds === 0 ? 0 : num(s.discussionSeconds, DEFAULTS.discussionSeconds, ...DISCUSSION),
      categoryID: categoryID(s.categoryID, (id) => PairBank.category(id) !== undefined),
    }));
    this.clampSettings();
  }

  // MARK: - წარმოებული მნიშვნელობები

  get canIncludeMrWhite(): boolean {
    return this.players.length >= 4;
  }

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
        // ჯაშუშმა არ იცის, რომ ჯაშუშია.
        return { word: this.undercoverWord, note: null, isSpecial: false };
      case 'mrWhite':
        return { word: 'მისტერ უაითი ხარ', note: 'სიტყვა არ გაქვს. მოუსმინე და მოერგე.', isSpecial: true };
    }
  }

  get results(): { player: Player; score: number }[] {
    return this.players.map((p) => ({ player: p, score: this.finalPoints[p.id] ?? 0 }));
  }

  // MARK: - პარამეტრების უსაფრთხო ცვლილება
  //
  // როლების რაოდენობა ერთმანეთზეა დამოკიდებული, ამიტომ UI პირდაპირ არ წერს
  // `settings`-ში — ამ მეთოდებს იძახებს და დიაპაზონი ყოველთვის ვალიდურია.

  setIncludeMrWhite(on: boolean): void {
    const includeMrWhite = on && this.canIncludeMrWhite;
    this.settings = { ...this.settings, includeMrWhite };
    this.settings = { ...this.settings, undercoverCount: Math.min(this.settings.undercoverCount, this.maxUndercovers) };
    this.persist();
  }

  setUndercoverCount(count: number): void {
    this.settings = { ...this.settings, undercoverCount: Math.min(Math.max(1, count), this.maxUndercovers) };
    this.persist();
  }

  setCategory(id: string | null): void {
    this.settings = { ...this.settings, categoryID: id };
    this.persist();
  }
  /** 0 = ტაიმერის გარეშე („∞“) — `DiscussionPanel` ამას იცნობს. */
  setDiscussionSeconds(seconds: number): void {
    this.settings = { ...this.settings, discussionSeconds: seconds === 0 ? 0 : num(seconds, DEFAULTS.discussionSeconds, ...DISCUSSION) };
    this.persist();
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    this.clampSettings();

    const { pair, category } = this.drawPair();
    this.categoryLabel = category.name;
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
    this.finalPoints = {};
    this.startingPlayerID = this.players[Math.floor(Math.random() * this.players.length)]?.id ?? null;

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
    this.eliminated.add(player.id);
    this.lastEliminatedID = player.id;

    if (this.roleOf(player) === 'mrWhite') {
      this.mrWhiteOptions = this.makeMrWhiteOptions();
      this.phase = 'mrWhiteGuess';
      this.notify();
    } else {
      this.phase = 'roundResult';
      this.evaluate();
      this.notify();
    }
  }

  submitMrWhiteGuess(word: string): void {
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
    if (this.winner !== null) return;
    this.turn += 1;
    const alive = this.alive;
    this.startingPlayerID = alive[Math.floor(Math.random() * alive.length)]?.id ?? null;
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
    const specialsAlive = this.alive.filter((p) => this.roles[p.id] !== 'civilian').length;
    const civiliansAlive = this.alive.filter((p) => this.roles[p.id] === 'civilian').length;

    if (specialsAlive === 0) this.finish('civilians');
    else if (specialsAlive >= civiliansAlive) this.finish('undercovers');
    // სხვა შემთხვევაში თამაში გრძელდება — `continueGame()` გადაიყვანს განხილვაზე.
  }

  private finish(result: SpyWinner): void {
    this.winner = result;
    const points: Record<string, number> = {};

    if (result === 'civilians') {
      for (const p of this.playersWith('civilian')) points[p.id] = 2;
    } else if (result === 'undercovers') {
      // გამარჯვება გადარჩენილებმა მოიტანეს — ამოვარდნილ ჯაშუშს არაფერი ერგება,
      // ცოცხალ Mr White-ს კი იგივე, რაც ჯაშუშს: `evaluate()` მასაც სპეციალურად თვლის.
      for (const p of this.alive) if (this.roles[p.id] !== 'civilian') points[p.id] = 3;
    } else {
      for (const p of this.playersWith('mrWhite')) points[p.id] = 4;
    }

    this.finalPoints = points;
    this.phase = 'gameOver';
    this.notify();
  }

  // MARK: - წყვილის არჩევა

  private drawPair() {
    const key = `pair.${this.settings.categoryID ?? 'all'}`;
    const pool = PairBank.pairs(this.settings.categoryID).map((p) => `${p.a}|${p.b}`);
    const shoe = this.shoes[key] ?? new ContentShoe(key, pool);
    this.shoes[key] = shoe;

    // ბოლო წყვილების სიტყვები დაბლოკილია — თორემ „ყავა/ჩაი“-ს მერე
    // „ყავა/კაკაო“ მოვა და მაგიდას იგივე მოეჩვენება.
    const blocked = new Set(shoe.recent.slice(0, SIMILARITY_WINDOW).flatMap((id) => id.split('|')));
    const drawn = shoe.draw((id) => id.split('|').some((w) => blocked.has(w)));

    const found = drawn ? PairBank.pair(drawn) : undefined;
    if (found) return found;
    // დასტა ვერაფერს დააბრუნებს მხოლოდ მაშინ, თუ კატეგორია ცარიელია.
    return PairBank.randomPair(this.settings.categoryID);
  }

  private makeMrWhiteOptions(): string[] {
    const others = shuffled(PairBank.allWords.filter((w) => w !== this.civilianWord)).slice(0, 5);
    return shuffled([...others, this.civilianWord]);
  }

  // MARK: - პარამეტრები

  private clampSettings(): void {
    if (!this.canIncludeMrWhite) this.settings.includeMrWhite = false;
    this.settings.undercoverCount = Math.min(Math.max(1, this.settings.undercoverCount), this.maxUndercovers);
  }

  private persist(): void {
    saveSettings(KEY, this.settings);
    this.notify();
  }
}
