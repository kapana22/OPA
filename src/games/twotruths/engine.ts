import { Observable } from '../../core/observable';
import { shuffled } from '../../core/shuffle';
import { TwoTruthsBank } from '../../content/banks';
import type { Player } from '../../core/roster';

/**
 * „ორი სიმართლე, ერთი ტყუილი“ — ავტორი წერს სამ ამბავს, ერთი მოგონილია.
 *
 * სასაუბრო თამაშია — ქულები არ არის. ამბები ეკრანზე ნომრებით ჩანს, ყველა
 * ერთდროულად თითებით აჩვენებს ტყუილის ნომერს, მერე ტელეფონი ტყუილს ამხელს
 * და ჯერი შემდეგ ავტორზე გადადის — წრე დაუსრულებლად ტრიალებს.
 *
 * პორტი: `Splash/Games/TwoTruths/TwoTruthsEngine.swift`.
 */

export type TwoTruthsPhase =
  | 'setup'
  | 'writeHandoff'  // ტელეფონი ავტორს გადაეცემა
  | 'write'         // ავტორი წერს სამ დებულებას და ნიშნავს ტყუილს
  | 'show'          // სამი ამბავი ნომრებით; ყველა თითებით აჩვენებს ტყუილის ნომერს
  | 'reveal';       // ტყუილი ცხადდება

export interface TwoTruthsHint {
  emoji: string;
  text: string;
}

export class TwoTruthsEngine extends Observable {
  readonly players: Player[];

  phase: TwoTruthsPhase = 'setup';
  turnIndex = 0;

  statements: string[] = ['', '', ''];
  lieIndex = 0;
  /** ეკრანზე რიგი ირევა — ტყუილის ადგილი არ უნდა ჩანდეს. */
  displayOrder: number[] = [0, 1, 2];

  hints: TwoTruthsHint[] = [];

  constructor(players: Player[]) {
    super();
    this.players = players;
  }

  // MARK: - წარმოებული მნიშვნელობები

  get author(): Player {
    if (this.players.length === 0) return { id: '—', name: '—', score: 0 };
    return this.players[this.turnIndex % this.players.length];
  }

  statementAt(position: number): string {
    const written = this.displayOrder[position];
    return written === undefined ? '' : this.statements[written];
  }
  writtenIndexAt(position: number): number {
    return this.displayOrder[position] ?? 0;
  }
  displayPositionOf(written: number): number {
    const i = this.displayOrder.indexOf(written);
    return i === -1 ? 0 : i;
  }
  isLieAt(position: number): boolean {
    return this.writtenIndexAt(position) === this.lieIndex;
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    this.turnIndex = 0;
    this.beginTurn();
  }

  beginWriting(): void {
    if (this.phase !== 'writeHandoff') return;
    this.phase = 'write';
    this.notify();
  }

  rollHints(): void {
    this.hints = TwoTruthsBank.nudges();
    this.notify();
  }

  /** მიღებულია თუ არა — უარისას ეკრანმა დაწერილი არ უნდა წაშალოს. */
  submit(written: string[], lie: number): boolean {
    if (this.phase !== 'write') return false;
    if (!TwoTruthsEngine.isValid(written, lie)) return false;

    this.statements = written.map((s) => s.trim());
    this.lieIndex = lie;
    this.displayOrder = shuffled([0, 1, 2]);
    this.phase = 'show';
    this.notify();
    return true;
  }

  /** სამი შევსებული, ერთმანეთისგან განსხვავებული ამბავი და მონიშნული ტყუილი. */
  static isValid(written: string[], lie: number | null): boolean {
    const cleaned = written.map((s) => s.trim());
    if (lie === null || cleaned.length !== 3 || cleaned.some((s) => !s) || lie < 0 || lie > 2) return false;
    return new Set(cleaned).size === 3;   // ერთნაირ ამბებში ტყუილი ვერ იმალება
  }

  /** ყველამ თითებით აჩვენა — ტყუილი ცხადდება. */
  revealLie(): void {
    if (this.phase !== 'show') return;
    this.phase = 'reveal';
    this.notify();
  }

  /** შემდეგი ავტორი, წრეზე. */
  next(): void {
    if (this.phase !== 'reveal') return;
    this.turnIndex += 1;
    this.beginTurn();
  }

  backToSetup(): void {
    this.phase = 'setup';
    this.notify();
  }

  // MARK: - შიდა

  private beginTurn(): void {
    this.statements = ['', '', ''];
    this.lieIndex = 0;
    this.displayOrder = [0, 1, 2];
    this.hints = TwoTruthsBank.nudges();
    this.phase = 'writeHandoff';
    this.notify();
  }
}
