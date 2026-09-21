import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { loadSettings, saveSettings, num, oneOf } from '../../core/settings';
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
  /** 0 = ულიმიტოდ. */
  cards: number;
}

const KEY = 'splash.darecard.settings.v1';
const DEFAULTS: DareCardSettings = { heat: 'party', forfeit: 'tableChoice', cards: 0 };
const HEATS: TruthDareHeat[] = ['family', 'party', 'spicy'];

export class DareCardEngine extends Observable {
  readonly players: Player[];
  settings: DareCardSettings;

  phase: DareCardPhase = 'setup';
  drawn = 0;
  currentCard: DareCard = { text: '—', kind: 'solo', heat: 'family' };
  holderIndex = 0;
  rivalIndex = 0;

  done: Record<string, number> = {};
  forfeits: Record<string, number> = {};

  private shoe = new ContentShoe('darecard.party', []);

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<DareCardSettings>(KEY, DEFAULTS, (s) => ({
      heat: oneOf(s.heat, HEATS, DEFAULTS.heat),
      forfeit: oneOf(s.forfeit, PARTY_FORFEITS, DEFAULTS.forfeit),
      cards: num(s.cards, DEFAULTS.cards, 0, 60),
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

  get isLastCard(): boolean {
    return this.settings.cards > 0 && this.drawn >= this.settings.cards;
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
    const top = this.ranking[0];
    return top && this.doneCount(top) > 0 ? top : null;
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
    const text = this.shoe.draw();
    const card = text ? DareCardBank.card(text) : undefined;
    if (!card) return;
    this.currentCard = card;
    this.pickRival();
  }

  private pickRival(): void {
    this.rivalIndex = this.players.length > 1 ? (this.holderIndex + 1) % this.players.length : 0;
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
  setCards(value: number): void {
    this.settings = { ...this.settings, cards: Math.min(Math.max(0, value), 60) };
    this.persist();
  }

  private persist(): void {
    saveSettings(KEY, this.settings);
    this.notify();
  }
}
