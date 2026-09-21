import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { loadSettings, saveSettings, num, oneOf } from '../../core/settings';
import { RuleCardBank, type RuleCard } from '../../content/banks';
import { PARTY_FORFEITS, type PartyForfeit } from '../../core/partyForfeit';
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
  forfeit: PartyForfeit;
  cards: number;
  ruleLimit: number;
}

const KEY = 'splash.rulecard.settings.v1';
const DEFAULTS: RuleCardSettings = { forfeit: 'tableChoice', cards: 25, ruleLimit: 6 };

export class RuleCardEngine extends Observable {
  readonly players: Player[];
  settings: RuleCardSettings;

  phase: RuleCardPhase = 'setup';
  drawn = 0;
  currentCard: RuleCard = { text: '—', kind: 'now', short: null };
  holderIndex = 0;

  /** მოქმედი წესები — თამაშის მთელი აზრი ამ სიაშია. */
  activeRules: ActiveRule[] = [];

  brought: Record<string, number> = {};
  forfeits: Record<string, number> = {};

  private shoe = new ContentShoe('rulecard.main', []);
  private reliefShoe = new ContentShoe('rulecard.relief', []);

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<RuleCardSettings>(KEY, DEFAULTS, (s) => ({
      forfeit: oneOf(s.forfeit, PARTY_FORFEITS, DEFAULTS.forfeit),
      cards: num(s.cards, DEFAULTS.cards, 0, 60),
      ruleLimit: num(s.ruleLimit, DEFAULTS.ruleLimit, 3, 10),
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

  get isLastCard(): boolean {
    return this.settings.cards > 0 && this.drawn >= this.settings.cards;
  }
  /** ჭერს მიაღწია — შემდეგი ბარათი „შვებიდან“ მოვა. */
  get rulesAreFull(): boolean {
    return this.activeRules.length >= this.settings.ruleLimit;
  }
  /** შვება უწესოდ უაზროა — ეკრანმა ეს უნდა იცოდეს. */
  get reliefIsPointless(): boolean {
    return this.currentCard.kind === 'relief' && this.activeRules.length === 0;
  }

  broughtCount(player: Player): number {
    return this.brought[player.id] ?? 0;
  }
  forfeitCount(player: Player): number {
    return this.forfeits[player.id] ?? 0;
  }

  scoreFor(player: Player): number {
    return this.broughtCount(player) - (this.settings.forfeit === 'point' ? this.forfeitCount(player) : 0);
  }

  get ranking(): Player[] {
    return [...this.players].sort((x, y) => {
      const a = this.scoreFor(x);
      const b = this.scoreFor(y);
      return a !== b ? b - a : x.name.localeCompare(y.name, 'ka');
    });
  }

  /** ვინ ყველაზე მეტი წესი შემოიტანა. */
  get lawmaker(): Player | null {
    const top = [...this.players].sort((a, b) => this.broughtCount(b) - this.broughtCount(a))[0];
    return top && this.broughtCount(top) > 0 ? top : null;
  }

  get mostForfeits(): Player[] {
    const values = Object.values(this.forfeits);
    const worst = values.length > 0 ? Math.max(...values) : 0;
    if (worst <= 0) return [];
    return this.players.filter((p) => this.forfeits[p.id] === worst);
  }

  get results(): { player: Player; score: number }[] {
    return this.players.map((p) => ({ player: p, score: this.scoreFor(p) }));
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    if (!this.canPlay) return;
    this.shoe = new ContentShoe('rulecard.main', RuleCardBank.mainDeck());
    this.reliefShoe = new ContentShoe('rulecard.relief', RuleCardBank.reliefDeck());
    this.drawn = 0;
    this.holderIndex = 0;
    this.activeRules = [];
    this.brought = {};
    this.forfeits = {};
    this.nextCard();
    this.phase = 'card';
    this.notify();
  }

  acceptRule(): void {
    const holder = this.holder;
    if (this.phase !== 'card' || this.currentCard.kind !== 'rule' || !holder) return;
    this.activeRules.push({ id: uuid(), card: this.currentCard, broughtBy: holder.name, atCard: this.drawn });
    this.brought[holder.id] = (this.brought[holder.id] ?? 0) + 1;
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

  /** ჯარიმა ცალკე ეტაპია — მაგიდა ჯერ წყვეტს, ვინ ვერ გაართვა თავი, და
   *  მხოლოდ დადასტურებისას ირიცხება: ეკრანზე ჩართვა-გამორთვა ძრავს არ ეხება. */
  finishForfeits(offenders: Player[]): void {
    if (this.phase !== 'card') return;
    for (const p of this.players.filter(player => offenders.some(offender => offender.id === player.id))) this.forfeits[p.id] = (this.forfeits[p.id] ?? 0) + 1;
    Haptics.warning();
    Sound.play('wrong');
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

  setForfeit(value: PartyForfeit): void {
    this.settings = { ...this.settings, forfeit: value };
    this.persist();
  }
  setCards(value: number): void {
    this.settings = { ...this.settings, cards: Math.min(Math.max(0, value), 60) };
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
