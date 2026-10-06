import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { GamePause, Ticker } from '../../core/ticker';
import type { Player } from '../../core/roster';
import { noYesNoQuestions } from './questions';

export type NoYesNoPhase = 'setup' | 'handoff' | 'playing' | 'result' | 'summary';
export class NoYesNoEngine extends Observable {
  readonly players: Player[];
  phase: NoYesNoPhase = 'setup';
  rounds = 1;
  readonly seconds = 30;
  turn = 0;
  remaining = 30;
  turnScore = 0;
  totals: Record<string, number> = {};
  question = '';
  questionVersion = 0;
  endReason: 'time' | 'forbidden' = 'time';
  private ticker = new Ticker();
  private shoe = new ContentShoe('noyesno.questions', noYesNoQuestions.map(q => q.id));
  private questionTexts = new Map(noYesNoQuestions.map(q => [q.id, q.text]));

  constructor(players: readonly Player[]) {
    super();
    this.players = [...players];
  }
  get currentPlayer(): Player | null { return this.players[this.turn % this.players.length] ?? null; }
  get interviewer(): Player | null { return this.players[(this.turn + 1) % this.players.length] ?? null; }
  get round(): number { return Math.floor(this.turn / Math.max(1, this.players.length)) + 1; }
  get isLastTurn(): boolean { return this.turn + 1 >= this.players.length * this.rounds; }
  totalFor(player: Player): number { return this.totals[player.id] ?? 0; }
  get ranking(): Player[] { return [...this.players].sort((a, b) => this.totalFor(b) - this.totalFor(a)); }
  rankOf(player: Player): number { return 1 + this.players.filter(p => this.totalFor(p) > this.totalFor(player)).length; }
  get winners(): Player[] { return this.ranking.filter(p => this.totalFor(p) > 0 && this.rankOf(p) === 1); }
  get results() { return this.players.map(player => ({ player, score: this.totalFor(player) })); }

  setRounds(value: number): void {
    if (this.phase !== 'setup' || ![1, 2, 3].includes(value)) return;
    this.rounds = value;
    this.notify();
  }
  startGame(): void {
    if (!['setup', 'summary'].includes(this.phase) || this.players.length < 2) return;
    this.ticker.stop();
    this.totals = {};
    this.turn = 0;
    this.turnScore = 0;
    this.phase = 'handoff';
    this.notify();
  }
  beginTurn(): void {
    if (this.phase !== 'handoff' || GamePause.isPaused) return;
    this.turnScore = 0;
    this.remaining = this.seconds;
    this.drawQuestion();
    this.phase = 'playing';
    this.ticker.start(1, () => {
      this.remaining -= 1;
      if (this.remaining <= 0) this.finish('time');
      else this.notify();
    });
    this.notify();
  }
  answer(version: number): void {
    if (!this.canJudge(version)) return;
    this.turnScore += 1;
    this.drawQuestion();
    this.notify();
  }
  skip(version: number): void {
    if (!this.canJudge(version)) return;
    this.drawQuestion();
    this.notify();
  }
  forbidden(version: number): void {
    if (!this.canJudge(version)) return;
    this.finish('forbidden');
  }
  next(): void {
    if (this.phase !== 'result') return;
    if (this.isLastTurn) this.phase = 'summary';
    else { this.turn += 1; this.phase = 'handoff'; }
    this.notify();
  }
  abandon(): void {
    this.ticker.stop();
    this.phase = 'setup';
  }
  private canJudge(version: number): boolean {
    return this.phase === 'playing' && !GamePause.isPaused && version === this.questionVersion;
  }
  private drawQuestion(): void {
    const id = this.shoe.draw();
    this.question = (id && this.questionTexts.get(id)) || noYesNoQuestions[0].text;
    this.questionVersion += 1;
  }
  private finish(reason: 'time' | 'forbidden'): void {
    if (this.phase !== 'playing') return;
    this.ticker.stop();
    this.endReason = reason;
    const player = this.currentPlayer;
    if (player) this.totals[player.id] = this.totalFor(player) + this.turnScore;
    this.phase = 'result';
    this.notify();
  }
}
