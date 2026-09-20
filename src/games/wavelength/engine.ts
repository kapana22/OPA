import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { SpectrumBank } from '../../content/banks';
import type { Player } from '../../core/roster';

export type WavelengthPhase = 'setup' | 'pass' | 'clue' | 'handoff' | 'guess' | 'side' | 'locked' | 'result' | 'summary';
export type Side = 'left' | 'right';
export interface Band { id: number; halfWidth: number; points: number }
export interface Spectrum { left: string; right: string }

/** Classic Wavelength: two teams, 0–1 start, 10-point goal, catch-up and paired tiebreak turns. */
export class WavelengthEngine extends Observable {
  static readonly bands: Band[] = [
    { id: 4, halfWidth: 0.025, points: 4 },
    { id: 3, halfWidth: 0.075, points: 3 },
    { id: 2, halfWidth: 0.125, points: 2 },
  ];
  readonly players: Player[];
  teams: [Player[], Player[]];
  scores: [number, number] = [0, 1];
  activeTeam = 0;
  winner: number | null = null;
  phase: WavelengthPhase = 'setup';
  round = 1;
  spectrum: Spectrum = { left: '—', right: '—' };
  target = 0.5;
  guess = 0.5;
  lastPoints = 0;
  otherPoints = 0;
  sideGuess: Side | null = null;
  catchUp = false;
  tiebreak = false;
  private tiebreakTurnsLeft = 0;
  private clueTurns = [0, 0];
  private shoe = new ContentShoe('spectrum.all', []);

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.teams = [players.filter((_, i) => i % 2 === 0), players.filter((_, i) => i % 2 === 1)];
  }
  get canPlay(): boolean { return this.teams.every((team) => team.length >= 2); }
  get otherTeam(): number { return 1 - this.activeTeam; }
  get goal(): number { return 10; }
  get clueGiver(): Player | null {
    const team = this.teams[this.activeTeam];
    return team[this.clueTurns[this.activeTeam] % team.length] ?? null;
  }
  get guessers(): Player[] { return this.teams[this.activeTeam].filter((p) => p.id !== this.clueGiver?.id); }
  get distance(): number { return Math.abs(this.guess - this.target); }
  teamName(index: number): string { return `გუნდი ${index + 1}`; }
  rewardFor(player: Player): number {
    if (this.winner === null) return 0;
    return this.teams[this.winner].some((p) => p.id === player.id) ? 3 : 1;
  }
  movePlayer(id: string): void {
    if (this.phase !== 'setup') return;
    const from = this.teams.findIndex((team) => team.some((p) => p.id === id));
    if (from < 0) return;
    const player = this.teams[from].find((p) => p.id === id)!;
    this.teams[from] = this.teams[from].filter((p) => p.id !== id);
    this.teams[1 - from] = [...this.teams[1 - from], player];
    this.notify();
  }
  pointsForDistance(distance: number): number {
    if (!Number.isFinite(distance) || distance < 0) return 0;
    return WavelengthEngine.bands.find((band) => distance <= band.halfWidth + 1e-9)?.points ?? 0;
  }
  startGame(): void {
    if (!this.canPlay) return;
    this.scores = [0, 1]; this.activeTeam = 0; this.winner = null; this.round = 1;
    this.clueTurns = [0, 0]; this.tiebreak = false; this.tiebreakTurnsLeft = 0;
    this.shoe = new ContentShoe('spectrum.all', SpectrumBank.deck(null));
    this.loadRound();
  }
  readyForClue(): void { if (this.phase === 'pass') { this.phase = 'clue'; this.notify(); } }
  beginGuess(): void { if (this.phase === 'clue') { this.phase = 'handoff'; this.notify(); } }
  readyToGuess(): void { if (this.phase === 'handoff') { this.phase = 'guess'; this.notify(); } }
  setGuess(value: number): void {
    if (this.phase !== 'guess' || !Number.isFinite(value)) return;
    this.guess = Math.max(0, Math.min(1, value)); this.notify();
  }
  lockGuess(): void { if (this.phase === 'guess') { this.phase = 'side'; this.notify(); } }
  chooseSide(side: Side): void {
    if (this.phase !== 'side' || !['left', 'right'].includes(side)) return;
    this.sideGuess = side; this.phase = 'locked'; this.notify();
  }
  reveal(): void {
    if (this.phase !== 'locked' || this.sideGuess === null) return;
    this.lastPoints = this.pointsForDistance(this.distance);
    const correctSide = this.target < this.guess ? 'left' : 'right';
    this.otherPoints = this.lastPoints !== 4 && this.sideGuess === correctSide ? 1 : 0;
    this.scores[this.activeTeam] += this.lastPoints;
    this.scores[this.otherTeam] += this.otherPoints;
    this.catchUp = false;
    if (this.tiebreak) {
      this.tiebreakTurnsLeft -= 1;
      if (this.tiebreakTurnsLeft === 0) {
        if (this.scores[0] === this.scores[1]) this.tiebreakTurnsLeft = 2;
        else this.winner = this.scores[0] > this.scores[1] ? 0 : 1;
      }
    } else if (Math.max(...this.scores) >= this.goal) {
      if (this.scores[0] === this.scores[1]) { this.tiebreak = true; this.tiebreakTurnsLeft = 2; }
      else this.winner = this.scores[0] > this.scores[1] ? 0 : 1;
    } else {
      this.catchUp = this.lastPoints === 4 && this.scores[this.activeTeam] < this.scores[this.otherTeam];
    }
    this.phase = 'result'; this.notify();
  }
  next(): void {
    if (this.phase !== 'result') return;
    if (this.winner !== null) { this.phase = 'summary'; this.notify(); return; }
    this.clueTurns[this.activeTeam] += 1;
    if (!this.catchUp) this.activeTeam = this.otherTeam;
    this.round += 1; this.loadRound();
  }
  restart(): void { this.startGame(); }
  backToSetup(): void { this.phase = 'setup'; this.notify(); }
  private loadRound(): void {
    const key = this.shoe.draw();
    this.spectrum = key ? SpectrumBank.parse(key) : { left: '—', right: '—' };
    this.target = Math.random(); this.guess = 0.5;
    this.lastPoints = 0; this.otherPoints = 0; this.sideGuess = null; this.catchUp = false;
    this.phase = 'pass'; this.notify();
  }
}
