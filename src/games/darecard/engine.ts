import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { loadSettings, saveSettings, oneOf } from '../../core/settings';
import { TurnRotation } from '../../core/turnRotation';
import { DareCardBank, type DareCard, type TruthDareHeat } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import type { Player } from '../../core/roster';

/**
 * „გააკეთე ან...“ — ბარათების დასტა. **არჩევანი არ არსებობს**: ბარათი კარნახობს
 * და შეიძლება შეეხოს ერთს, ორს ან მთელ მაგიდას. ქულები არ არის — ვინ
 * შეასრულა და ვინ იხადა, მაგიდა თვითონ ხედავს.
 *
 * პორტი: `Splash/Games/DareCard/DareCardEngine.swift`.
 */

export type DareCardPhase = 'setup' | 'card' | 'summary';

export interface DareCardSettings {
  heat: TruthDareHeat;
  /**
   * წრეები: 1–3 · 0 = ულიმიტოდ. ცალობითი რაოდენობა (15 / 25 / 40) მოთამაშეებზე
   * არ იყოფოდა და ზოგს მეტი ბარათი ხვდებოდა.
   */
  laps: number;
}

const KEY = 'splash.darecard.settings.v1';
const DEFAULTS: DareCardSettings = { heat: 'party', laps: 0 };
/** 0 = ულიმიტოდ. */
// ბარათი სწრაფია (≈ ნახევარი წუთი), ამიტომ 1–3 წრე მცირე კომპანიაში ძალიან მოკლე
// გამოდიოდა (2 კაცზე 3 წრე = 6 ბარათი). აქ წრეები უფრო დიდი ნაბიჯით მიდის.
const CARD_LAPS = [2, 4, 6] as const;
const MAX_LAPS = CARD_LAPS[CARD_LAPS.length - 1];
export const DARECARD_LAP_OPTIONS = [0, ...CARD_LAPS];
const HEATS: TruthDareHeat[] = ['family', 'party', 'spicy'];

export class DareCardEngine extends Observable {
  readonly players: Player[];
  settings: DareCardSettings;

  phase: DareCardPhase = 'setup';
  drawn = 0;
  currentCard: DareCard = { text: '—', kind: 'solo', heat: 'family' };
  holderIndex = 0;
  rivalIndex = 0;
  /** ბარათის შეცვლა ჯერზე ერთხელ — თორემ რთულ ბარათს უსასრულოდ აარიდებდი. */
  swapped = false;

  private shoe = new ContentShoe('darecard.party', []);

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<DareCardSettings>(KEY, DEFAULTS, (s) => ({
      heat: oneOf(s.heat, HEATS, DEFAULTS.heat),
      // ლიმიტი აღარ არის — მაგიდა თვითონ ასრულებს.
      laps: DEFAULTS.laps,
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

  /** დუელის მეტოქე — მხოლოდ `duel` ტიპის ბარათზე. */
  get rival(): Player | null {
    if (this.currentCard.kind !== 'duel' || this.players.length <= 1) return null;
    return this.players[this.rivalIndex] ?? null;
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
  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    if (!this.canPlay) return;
    this.shoe = new ContentShoe(`darecard.${this.settings.heat}`, DareCardBank.deck(this.settings.heat));
    this.drawn = 0;
    this.holderIndex = 0;
    this.nextCard();
    this.phase = 'card';
    this.notify();
  }

  /** ბარათი დასრულდა — შესრულდა თუ იხადეს, მაგიდის საქმეა. */
  next(): void {
    if (this.phase !== 'card') return;
    Haptics.success();
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
    const text = this.shoe.draw();
    const card = text ? DareCardBank.card(text) : undefined;
    if (!card) return;
    this.currentCard = card;
    this.pickRival();
  }

  /** მეტოქე — შემთხვევითი სხვა მოთამაშე (ადრე ყოველთვის მომდევნო იყო). */
  private pickRival(): void {
    const n = this.players.length;
    if (n <= 1) {
      this.rivalIndex = 0;
      return;
    }
    const holder = this.holderIndex % n;
    this.rivalIndex = (holder + 1 + Math.floor(Math.random() * (n - 1))) % n;
  }

  // MARK: - პარამეტრები

  setHeat(value: TruthDareHeat): void {
    this.settings = { ...this.settings, heat: value };
    this.persist();
  }
  setLaps(value: number): void {
    this.settings = { ...this.settings, laps: Math.min(Math.max(0, Math.round(value)), MAX_LAPS) };
    this.persist();
  }

  private persist(): void {
    saveSettings(KEY, this.settings);
    this.notify();
  }
}
