import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import type { Player } from '../../core/roster';
import { HERD_QUESTIONS } from './questions';

/** პასუხები ხმამაღლა; ტელეფონი კითხვებს აჩვენებს და არ აგროვებს ქულებს. */
export type HerdPhase = 'setup' | 'question';

export class HerdEngine extends Observable {
  readonly players: Player[];
  phase: HerdPhase = 'setup';
  round = 1;
  question = '';
  private shoe = new ContentShoe('herd.classic.v1', HERD_QUESTIONS);

  constructor(players: Player[]) { super(); this.players = players; }
  get canPlay() { return this.players.length >= 4; }

  startGame() {
    if (!this.canPlay) return;
    this.round = 1;
    this.loadQuestion();
  }

  next() {
    if (this.phase !== 'question') return;
    this.round++;
    this.loadQuestion();
  }

  private loadQuestion() {
    this.question = this.shoe.draw() ?? HERD_QUESTIONS[0];
    this.phase = 'question';
    this.notify();
  }
}
