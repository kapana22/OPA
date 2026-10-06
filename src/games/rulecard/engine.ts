import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { loadSettings, saveSettings } from '../../core/settings';
import { TurnRotation } from '../../core/turnRotation';
import { RuleCardBank, type RuleCard } from '../../content/banks';
import { uuid } from '../../core/id';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import type { Player } from '../../core/roster';

/**
 * „მაგიდის წესები“ — ბარათები, რომლებიც არ თავდება.
 *
 * აპში **პირველი მექანიკაა, რომელსაც რაუნდებს შორის მდგომარეობა აქვს**:
 * `rule` ტიპის ბარათი მოქმედი წესების სიაში გადადის და ბოლომდე იქ რჩება.
 * მეოთხე წესის შემდეგ მაგიდა უკვე სულ სხვანაირად ლაპარაკობს.
 *
 * „შვება“ **სარქველია**: მხოლოდ მაშინ მოდის, როცა წესებმა ჭერს მიაღწია,
 * ამიტომ საკუთარი დასტა აქვს და ჩვეულებრივში საერთოდ არ დევს.
 *
 * ქულები და ჯარიმების დათვლა არ არის — ვინ დაარღვია, მაგიდა თვითონ ხედავს.
 *
 * პორტი: `Splash/Games/RuleCard/RuleCardEngine.swift`.
 */

export type RuleCardPhase = 'setup' | 'card' | 'summary';

export interface ActiveRule {
  id: string;
  card: RuleCard;
  broughtBy: string;
  atCard: number;
}

export interface RuleCardSettings {
  /**
   * წრეები: 1–3 · 0 = ულიმიტოდ. ცალობითი რაოდენობა (20 / 30 / 45) მოთამაშეებზე
   * არ იყოფოდა და ზოგს მეტი ბარათი (მეტი შანსი წესზე) ხვდებოდა.
   */
  laps: number;
  ruleLimit: number;
}

const KEY = 'splash.rulecard.settings.v1';
// ნაგულისხმევი მნიშვნელობა ღილაკებს შორის უნდა იყოს, თორემ პირველ გაშვებაზე არცერთი არ ინთება.
const DEFAULTS: RuleCardSettings = { laps: 0, ruleLimit: 6 };
/** 0 = ულიმიტოდ. */
// ბარათი სწრაფია (≈ ნახევარი წუთი), ამიტომ 1–3 წრე მცირე კომპანიაში ძალიან მოკლე
// გამოდიოდა (2 კაცზე 3 წრე = 6 ბარათი). აქ წრეები უფრო დიდი ნაბიჯით მიდის.
const CARD_LAPS = [2, 4, 6] as const;
const MAX_LAPS = CARD_LAPS[CARD_LAPS.length - 1];
export const RULECARD_LAP_OPTIONS = [0, ...CARD_LAPS];

export class RuleCardEngine extends Observable {
  readonly players: Player[];
  settings: RuleCardSettings;

  phase: RuleCardPhase = 'setup';
  drawn = 0;
  currentCard: RuleCard = { text: '—', kind: 'now', short: null };
  holderIndex = 0;
  /** ბარათის შეცვლა ჯერზე ერთხელ. */
  swapped = false;

  /** მოქმედი წესები — თამაშის მთელი აზრი ამ სიაშია. */
  activeRules: ActiveRule[] = [];

  private shoe = new ContentShoe('rulecard.main', []);
  private reliefShoe = new ContentShoe('rulecard.relief', []);

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<RuleCardSettings>(KEY, DEFAULTS, () => ({
      // ლიმიტი აღარ არის — მაგიდა თვითონ ასრულებს.
      laps: DEFAULTS.laps,
      ruleLimit: DEFAULTS.ruleLimit,
    }));
  }

  // MARK: - წარმოებული მნიშვნელობები

  get canPlay(): boolean {
    return this.players.length >= 2;
  }

  get holder(): Player | null {
    if (this.players.length === 0) return null;
    return this.players[this.holderIndex % this.players.length] ?? null;
  }

  get isEndless(): boolean {
    return this.settings.laps <= 0;
  }
  /** ბარათების რაოდენობა — მთელი წრეები, ყველას თანაბრად. ულიმიტოზე 0. */
  get totalCards(): number {
    return this.isEndless ? 0 : TurnRotation.rounds(this.settings.laps, this.players.length);
  }
  get isLastCard(): boolean {
    return !this.isEndless && this.drawn >= this.totalCards;
  }
  get canSwap(): boolean {
    return this.phase === 'card' && !this.swapped;
  }
  /** ჭერს მიაღწია — შემდეგი ბარათი „შვებიდან“ მოვა. */
  get rulesAreFull(): boolean {
    return this.activeRules.length >= this.settings.ruleLimit;
  }
  /** შვება უწესოდ უაზროა — ეკრანმა ეს უნდა იცოდეს. */
  get reliefIsPointless(): boolean {
    return this.currentCard.kind === 'relief' && this.activeRules.length === 0;
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    if (!this.canPlay) return;
    this.shoe = new ContentShoe('rulecard.main', RuleCardBank.mainDeck());
    this.reliefShoe = new ContentShoe('rulecard.relief', RuleCardBank.reliefDeck());
    this.drawn = 0;
    this.holderIndex = 0;
    this.activeRules = [];
    this.nextCard();
    this.phase = 'card';
    this.notify();
  }

  acceptRule(): void {
    const holder = this.holder;
    if (this.phase !== 'card' || this.currentCard.kind !== 'rule' || !holder) return;
    this.activeRules.push({ id: uuid(), card: this.currentCard, broughtBy: holder.name, atCard: this.drawn });
    Haptics.success();
    Sound.play('reveal');
    this.advance();
  }

  markDone(): void {
    if (this.phase !== 'card') return;
    Haptics.success();
    Sound.play('correct');
    this.advance();
  }

  removeRule(rule: ActiveRule): void {
    if (this.phase !== 'card' || !this.activeRules.some((r) => r.id === rule.id)) return;
    this.activeRules = this.activeRules.filter((r) => r.id !== rule.id);
    Haptics.medium();
    Sound.play('correct');
    this.advance();
  }

  swapCard(): void {
    if (!this.canSwap) return;
    this.swapped = true;
    this.drawCard();
    Haptics.tap();
    this.notify();
  }

  finishNow(): void {
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

  private advance(): void {
    if (this.isLastCard) {
      // ზეიმის ჰაპტიკა შეჯამების ეკრანზეა — აქ მეორედ აღარ.
      this.phase = 'summary';
    } else {
      this.holderIndex += 1;
      this.nextCard();
    }
    this.notify();
  }

  private nextCard(): void {
    this.drawn += 1;
    this.swapped = false;
    this.drawCard();
  }

  private drawCard(): void {
    // სარქველი: წესებმა ჭერს მიაღწია — შვების დასტიდან ვიღებთ.
    const source = this.rulesAreFull ? this.reliefShoe : this.shoe;
    const text = source.draw();
    const card = text ? RuleCardBank.card(text) : undefined;
    if (card) this.currentCard = card;
  }

  // MARK: - პარამეტრები

  setLaps(value: number): void {
    this.settings = { ...this.settings, laps: Math.min(Math.max(0, Math.round(value)), MAX_LAPS) };
    this.persist();
  }

  setRuleLimit(value: number): void {
    this.settings = { ...this.settings, ruleLimit: Math.min(Math.max(3, value), 10) };
    this.persist();
  }

  private persist(): void {
    saveSettings(KEY, this.settings);
    this.notify();
  }
}
