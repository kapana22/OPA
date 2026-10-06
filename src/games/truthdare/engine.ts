import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { shuffled } from '../../core/shuffle';
import { TurnRotation } from '../../core/turnRotation';
import { loadSettings, saveSettings, oneOf } from '../../core/settings';
import { DareCardBank, TruthDareBank, heatName, type TruthDareHeat } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import type { Player } from '../../core/roster';

/**
 * „სიმართლე თუ მოქმედება“ — ბოთლი ტრიალებს, ორი გზაა.
 * ქულები არ არის — ეს საუბრის თამაშია.
 *
 * პორტი: `Splash/Games/TruthDare/TruthDareEngine.swift`.
 */

export type TruthDarePhase = 'setup' | 'turn' | 'task' | 'summary';
export type TruthDareChoice = 'truth' | 'dare';
export type TruthDareOrder = 'circle' | 'bottle';

export const orderTitle: Record<TruthDareOrder, string> = { circle: 'რიგით', bottle: 'ბოთლით' };
export const orderIcon: Record<TruthDareOrder, string> = {
  circle: 'arrow.triangle.2.circlepath',
  bottle: 'arrow.clockwise.circle.fill',
};

export interface TruthDareSettings {
  heat: TruthDareHeat;
  /**
   * წრეები: 1–3 · −1 = ულიმიტოდ. ცალობითი რაოდენობა (10 / 20) აღარ გვაქვს —
   * მოთამაშეთა რიცხვზე არ იყოფოდა და ზოგს მეტი ჯერი ხვდებოდა.
   */
  laps: number;
  order: TruthDareOrder;
}

const KEY = 'splash.truthdare.settings.v2'; // v1 ნაგულისხმევად წრეს ინახავდა
const DEFAULTS: TruthDareSettings = { heat: 'party', laps: -1, order: 'bottle' };
export const TRUTHDARE_ORDERS: TruthDareOrder[] = ['bottle', 'circle'];
/** −1 = ულიმიტოდ. */
export const TRUTHDARE_LAP_OPTIONS = [...TurnRotation.lapOptions, -1];
const HEATS: TruthDareHeat[] = ['family', 'party', 'spicy'];

export class TruthDareEngine extends Observable {
  readonly players: Player[];
  settings: TruthDareSettings;

  phase: TruthDarePhase = 'setup';
  turn = 1;
  currentIndex = 0;
  choice: TruthDareChoice = 'truth';
  currentText = '';
  /** ბარათის შეცვლა ჯერზე ერთხელ — თორემ „მოქმედება“ იოლ ბარათამდე იცვლებოდა. */
  swapped = false;

  private bottleOrder: number[] = [];
  private bottleStep = 0;
  private truthShoe = new ContentShoe('truth.party', []);
  private dareShoe = new ContentShoe('dare.party', []);
  /** ჯარიმები უარისთვის — Do or Pay-ის „შენ“ ბარათები, იმავე დონის. */
  private penaltyShoe = new ContentShoe('truthdare.penalty.party', []);
  /** უარის შემდეგ ნაჩვენები ჯარიმა; `null` — უარი ჯერ არ უთქვამს. */
  penalty: string | null = null;

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<TruthDareSettings>(KEY, DEFAULTS, (s) => ({
      heat: oneOf(s.heat, HEATS, DEFAULTS.heat),
      // ლიმიტი აღარ არის — მაგიდა თვითონ ასრულებს (ძველი შენახული წრეები აღარ მოქმედებს).
      laps: DEFAULTS.laps,
      order: oneOf(s.order, TRUTHDARE_ORDERS, DEFAULTS.order),
    }));
  }

  // MARK: - წარმოებული მნიშვნელობები

  get canPlay(): boolean {
    return this.players.length >= 2;
  }

  get isEndless(): boolean {
    return this.settings.laps < 0;
  }

  get totalTurns(): number {
    if (this.isEndless) return Number.MAX_SAFE_INTEGER;
    return TurnRotation.rounds(this.settings.laps, this.players.length);
  }

  get canSwap(): boolean {
    return this.phase === 'task' && !this.swapped;
  }

  get isLastTurn(): boolean {
    return !this.isEndless && this.turn >= this.totalTurns;
  }

  get currentPlayer(): Player | null {
    return this.players[this.currentIndex] ?? null;
  }

  get heatName(): string {
    return heatName[this.settings.heat];
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    if (!this.canPlay) return;
    this.truthShoe = new ContentShoe(`truth.${this.settings.heat}`, TruthDareBank.deck(this.settings.heat, true));
    this.dareShoe = new ContentShoe(`dare.${this.settings.heat}`, TruthDareBank.deck(this.settings.heat, false));
    this.penaltyShoe = new ContentShoe(
      `truthdare.penalty.${this.settings.heat}`,
      shuffled(DareCardBank.cards(this.settings.heat).filter((c) => c.kind === 'solo').map((c) => c.text)),
    );
    this.turn = 1;
    if (this.settings.order === 'bottle') {
      this.reshuffleBottle(null);
      this.currentIndex = this.bottleOrder[0] ?? 0;
      this.bottleStep = 0;
    } else {
      this.currentIndex = 0;
    }
    this.phase = 'turn';
    this.notify();
  }

  pick(value: TruthDareChoice): void {
    if (this.phase !== 'turn') return;
    this.choice = value;
    this.currentText = this.draw(value === 'truth');
    this.swapped = false;
    this.penalty = null;
    Haptics.medium();
    Sound.play('reveal');
    this.phase = 'task';
    this.notify();
  }

  /** ბარათი არ მოგვწონს — სხვა მოდის, არჩევანი კი იგივე რჩება. */
  swap(): void {
    if (!this.canSwap || this.penalty !== null) return;
    this.swapped = true;
    this.currentText = this.draw(this.choice === 'truth');
    Haptics.tap();
    this.notify();
  }

  /** უარი — ტელეფონი შემთხვევით ჯარიმას აჩვენებს. ერთ ჯერზე ერთხელ. */
  refuse(): void {
    if (this.phase !== 'task' || this.penalty !== null) return;
    this.penalty = this.penaltyShoe.draw() ?? 'მაგიდა ჯარიმას თვითონ მოიფიქრებს.';
    Haptics.warning();
    Sound.play('wrong');
    this.notify();
  }

  /** ჯერი დასრულდა — შეასრულა ან ჯარიმა გადაიხადა. */
  next(): void {
    if (this.phase !== 'task') return;
    this.penalty = null;
    Haptics.success();
    this.advance();
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
    if (this.isLastTurn) {
      this.phase = 'summary';
      this.notify();
      return;
    }
    this.turn += 1;
    this.currentIndex = this.nextIndex();
    this.phase = 'turn';
    this.notify();
  }

  private nextIndex(): number {
    if (this.players.length <= 1) return 0;
    if (this.settings.order === 'circle') return (this.currentIndex + 1) % this.players.length;

    this.bottleStep += 1;
    if (this.bottleStep >= this.bottleOrder.length) {
      this.reshuffleBottle(this.currentIndex);
      this.bottleStep = 0;
    }
    return this.bottleOrder[this.bottleStep] ?? 0;
  }

  /** ბოთლი წრეს ურევს — ოღონდ ზედიზედ ერთსა და იმავეზე არ ჩერდება. */
  private reshuffleBottle(previous: number | null): void {
    if (this.players.length <= 1) {
      this.bottleOrder = [0];
      return;
    }
    const order = shuffled(this.players.map((_, i) => i));
    if (previous !== null && order[0] === previous) {
      const j = 1 + Math.floor(Math.random() * (order.length - 1));
      [order[0], order[j]] = [order[j], order[0]];
    }
    this.bottleOrder = order;
  }

  private draw(truth: boolean): string {
    return (truth ? this.truthShoe.draw() : this.dareShoe.draw()) ?? '—';
  }

  // MARK: - პარამეტრები

  setHeat(value: TruthDareHeat): void {
    this.settings = { ...this.settings, heat: value };
    this.persist();
  }
  setLaps(value: number): void {
    this.settings = { ...this.settings, laps: value < 0 ? -1 : Math.min(Math.max(1, Math.round(value)), 3) };
    this.persist();
  }

  setOrder(value: TruthDareOrder): void {
    this.settings = { ...this.settings, order: value };
    this.persist();
  }

  private persist(): void {
    saveSettings(KEY, this.settings);
    this.notify();
  }
}
