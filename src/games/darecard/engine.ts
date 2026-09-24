import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { loadSettings, saveSettings, num, oneOf } from '../../core/settings';
import { TurnRotation } from '../../core/turnRotation';
import { DareCardBank, type DareCard, type TruthDareHeat } from '../../content/banks';
import { PARTY_FORFEITS, type PartyForfeit } from '../../core/partyForfeit';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import type { Player } from '../../core/roster';

/**
 * „გააკეთე ან...“ — ბარათების დასტა. **არჩევანი არ არსებობს**: ბარათი კარნახობს
 * და შეიძლება შეეხოს ერთს, ორს ან მთელ მაგიდას.
 *
 * პორტი: `Splash/Games/DareCard/DareCardEngine.swift`.
 */

export type DareCardPhase = 'setup' | 'card' | 'summary';

export interface DareCardSettings {
  heat: TruthDareHeat;
  forfeit: PartyForfeit;
  /**
   * წრეები: 1–3 · 0 = ულიმიტოდ. ცალობითი რაოდენობა (15 / 25 / 40) მოთამაშეებზე
   * არ იყოფოდა და ზოგს მეტი ბარათი ხვდებოდა, ქულა კი პოდიუმზე მიდის.
   */
  laps: number;
}

const KEY = 'splash.darecard.settings.v1';
const DEFAULTS: DareCardSettings = { heat: 'party', forfeit: 'tableChoice', laps: 0 };
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

  done: Record<string, number> = {};
  forfeits: Record<string, number> = {};

  private shoe = new ContentShoe('darecard.party', []);

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<DareCardSettings>(KEY, DEFAULTS, (s) => ({
      heat: oneOf(s.heat, HEATS, DEFAULTS.heat),
      forfeit: oneOf(s.forfeit, PARTY_FORFEITS, DEFAULTS.forfeit),
      laps: DareCardEngine.sanitizeLaps(s, players.length),
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
  get needsDuelWinner(): boolean {
    return this.currentCard.kind === 'duel' && this.rival !== null;
  }

  doneCount(player: Player): number {
    return this.done[player.id] ?? 0;
  }
  forfeitCount(player: Player): number {
    return this.forfeits[player.id] ?? 0;
  }

  scoreFor(player: Player): number {
    return this.doneCount(player) - (this.settings.forfeit === 'point' ? this.forfeitCount(player) : 0);
  }

  get ranking(): Player[] {
    return [...this.players].sort((x, y) => {
      const a = this.scoreFor(x);
      const b = this.scoreFor(y);
      return a !== b ? b - a : x.name.localeCompare(y.name, 'ka');
    });
  }

  get champion(): Player | null {
    return this.champions[0] ?? null;
  }

  /** ყველა, ვინც პირველ ადგილს იყოფს — ფრე ანბანით აღარ წყდება. */
  get champions(): Player[] {
    const top = this.ranking[0];
    if (!top) return [];
    const best = this.scoreFor(top);
    return this.ranking.filter((p) => this.scoreFor(p) === best && this.doneCount(p) > 0);
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

  resolveParticipants(outcomes: Record<string, 'done' | 'forfeit'>): void {
    if (this.phase !== 'card' || !['group', 'target'].includes(this.currentCard.kind)) return;
    const participants = this.players.filter(p => outcomes[p.id] === 'done' || outcomes[p.id] === 'forfeit');
    if (participants.length === 0) return;
    for (const p of participants) {
      const counts = outcomes[p.id] === 'done' ? this.done : this.forfeits;
      counts[p.id] = (counts[p.id] ?? 0) + 1;
    }
    this.advance();
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    if (!this.canPlay) return;
    this.shoe = new ContentShoe(`darecard.${this.settings.heat}`, DareCardBank.deck(this.settings.heat));
    this.drawn = 0;
    this.holderIndex = 0;
    this.done = {};
    this.forfeits = {};
    this.nextCard();
    this.phase = 'card';
    this.notify();
  }

  markDone(): void {
    if (this.phase !== 'card' || this.currentCard.kind !== 'solo' || !this.holder) return;
    this.done[this.holder.id] = this.doneCount(this.holder) + 1;
    Haptics.success();
    Sound.play('correct');
    this.advance();
  }

  markForfeit(): void {
    if (this.phase !== 'card' || this.currentCard.kind !== 'solo' || !this.holder) return;
    this.forfeits[this.holder.id] = this.forfeitCount(this.holder) + 1;
    Haptics.warning();
    Sound.play('wrong');
    this.advance();
  }

  /** დუელი ორ ჩანაწერს ტოვებს — გამარჯვებულს და წაგებულს. */
  resolveDuel(winner: Player): void {
    const holder = this.holder;
    const rival = this.rival;
    if (this.phase !== 'card' || !this.needsDuelWinner || !holder || !rival || ![holder.id, rival.id].includes(winner.id)) return;
    const loser = winner.id === holder.id ? rival : holder;
    this.done[winner.id] = (this.done[winner.id] ?? 0) + 1;
    this.forfeits[loser.id] = (this.forfeits[loser.id] ?? 0) + 1;
    Haptics.success();
    Sound.play('correct');
    this.advance();
  }

  skipCard(): void {
    if (this.phase === 'card' && ['group', 'target'].includes(this.currentCard.kind)) this.advance();
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
  setForfeit(value: PartyForfeit): void {
    this.settings = { ...this.settings, forfeit: value };
    this.persist();
  }
  setLaps(value: number): void {
    this.settings = { ...this.settings, laps: Math.min(Math.max(0, Math.round(value)), MAX_LAPS) };
    this.persist();
  }

  /** შენახული მნიშვნელობა — ახალი `laps` ან ძველი `cards` (0 = ულიმიტო, N = ცალობით). */
  private static sanitizeLaps(s: Partial<DareCardSettings> & { cards?: unknown }, players: number): number {
    if (typeof s.laps === 'number' && Number.isFinite(s.laps)) return num(Math.round(s.laps), DEFAULTS.laps, 0, MAX_LAPS);
    if (typeof s.cards === 'number' && Number.isFinite(s.cards)) {
      return s.cards <= 0 ? 0 : Math.min(Math.max(1, Math.round(s.cards / Math.max(1, players))), MAX_LAPS);
    }
    return DEFAULTS.laps;
  }

  private persist(): void {
    saveSettings(KEY, this.settings);
    this.notify();
  }
}
