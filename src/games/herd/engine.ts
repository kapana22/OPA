import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import type { Player } from '../../core/roster';
import { HERD_QUESTIONS } from './questions';

export type HerdPhase = 'setup' | 'intro' | 'pass' | 'writing' | 'review' | 'result' | 'summary';
export class HerdEngine extends Observable {
  readonly players: Player[];
  phase: HerdPhase = 'setup';
  round = 1;
  question = '';
  voterIndex = 0;
  answers: Record<string, string> = {};
  groups: Record<string, string> = {};
  totals: Record<string, number> = {};
  pinkCow: string | null = null;
  roundWinners: string[] = [];
  winners: string[] = [];
  isTie = false;
  private shoe = new ContentShoe('herd.classic.v1', HERD_QUESTIONS);

  constructor(players: Player[]) { super(); this.players = players; }
  get canPlay() { return this.players.length >= 4; }
  get currentVoter() { return this.players[this.voterIndex] ?? null; }
  totalFor(player: Player) { return this.totals[player.id] ?? 0; }
  get ranking() { return [...this.players].sort((a, b) => this.totalFor(b) - this.totalFor(a)); }
  get answerGroups() {
    const grouped = new Map<string, Player[]>();
    for (const player of this.players) {
      const key = this.groups[player.id];
      if (key === undefined) continue;
      grouped.set(key, [...(grouped.get(key) ?? []), player]);
    }
    return [...grouped].map(([id, players]) => ({ id, players }));
  }
  startGame() {
    if (!this.canPlay) return;
    this.round = 1; this.totals = {}; this.pinkCow = null; this.winners = [];
    this.loadQuestion();
  }
  private loadQuestion() {
    this.question = this.shoe.draw() ?? HERD_QUESTIONS[0];
    this.answers = {}; this.groups = {}; this.voterIndex = 0;
    this.roundWinners = []; this.isTie = false; this.phase = 'intro'; this.notify();
  }
  beginVoting() { if (this.phase === 'intro') { this.phase = 'pass'; this.notify(); } }
  beginWriting() { if (this.phase === 'pass') { this.phase = 'writing'; this.notify(); } }
  hideAnswer() { if (this.phase === 'writing') { this.phase = 'pass'; this.notify(); } }
  submit(answer: string) {
    if (this.phase !== 'writing' || !this.currentVoter || !answer.trim() || answer.trim().length > 80) return;
    this.answers[this.currentVoter.id] = answer.trim();
    this.voterIndex++;
    if (this.voterIndex === this.players.length) {
      this.phase = 'review'; this.resetGroups();
    } else { this.phase = 'pass'; this.notify(); }
  }
  resetGroups() {
    if (this.phase !== 'review') return;
    this.groups = Object.fromEntries(this.players.map(p => [p.id, this.answers[p.id].normalize('NFC').toLocaleLowerCase('ka').replace(/\s+/g, ' ').trim()]));
    this.notify();
  }
  mergeGroups(ids: string[]) {
    if (this.phase !== 'review' || ids.length < 2 || !ids.every(id => this.answerGroups.some(g => g.id === id))) return;
    for (const p of this.players) if (ids.includes(this.groups[p.id])) this.groups[p.id] = ids[0];
    this.notify();
  }
  scoreRound() {
    if (this.phase !== 'review') return;
    const groups = this.answerGroups;
    const largest = Math.max(...groups.map(g => g.players.length));
    const leaders = groups.filter(g => g.players.length === largest);
    this.isTie = leaders.length > 1;
    this.roundWinners = this.isTie ? [] : leaders[0].players.map(p => p.id);
    for (const id of this.roundWinners) this.totals[id] = (this.totals[id] ?? 0) + 1;
    const singles = groups.filter(g => g.players.length === 1);
    if (singles.length === 1) this.pinkCow = singles[0].players[0].id;
    // A cow holder keeps their points, but cannot win until the cow moves.
    this.winners = this.players.filter(p => this.totalFor(p) >= 8 && p.id !== this.pinkCow).map(p => p.id);
    this.phase = 'result'; this.notify();
  }
  next() {
    if (this.phase !== 'result') return;
    if (this.winners.length) { this.phase = 'summary'; this.notify(); }
    else { this.round++; this.loadQuestion(); }
  }
  skipQuestion() { if (this.phase === 'intro') this.loadQuestion(); }
}
