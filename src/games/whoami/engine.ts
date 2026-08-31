import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { Ticker } from '../../core/ticker';
import { TurnRotation } from '../../core/turnRotation';
import { TiltSensor } from '../../core/tiltSensor';
import { Screen } from '../../core/screen';
import { uuid } from '../../core/id';
import { loadSettings, saveSettings, num, bool, categoryID } from '../../core/settings';
import { IdentityBank } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import type { Player } from '../../core/roster';

/**
 * „ვინ ვარ მე?“ — სახელი შუბლზე, კითხვები კი / არა.
 *
 * პორტი: `Splash/Games/WhoAmI/WhoAmIEngine.swift`.
 * სტრუქტურით `CharadesEngine`-ის ტყუპია, ლექსიკა კი სხვაა:
 * `identity` / `guessed` / `passed`.
 */

export type WhoAmIPhase = 'setup' | 'turnIntro' | 'countdown' | 'playing' | 'turnResult' | 'summary';
export type WhoAmIVerdict = 'guessed' | 'passed';

export interface WhoAmIEntry {
  id: string;
  identity: string;
  verdict: WhoAmIVerdict;
  isOvertime: boolean;
}

export interface WhoAmIFlash {
  id: string;
  verdict: WhoAmIVerdict;
}

export interface WhoAmISettings {
  seconds: number;
  laps: number;
  categoryID: string | null;
  invertTilt: boolean;
}

const KEY = 'splash.whoami.settings.v2'; // v1 ცალობით ჯერს ინახავდა
const DEFAULTS: WhoAmISettings = { seconds: 90, laps: 1, categoryID: null, invertTilt: false };

export class WhoAmIEngine extends Observable {
  readonly players: Player[];
  settings: WhoAmISettings;

  phase: WhoAmIPhase = 'setup';
  turnIndex = 0;
  currentIdentity = '';
  remaining = 0;
  countdown = 3;
  results: WhoAmIEntry[] = [];
  flash: WhoAmIFlash | null = null;
  scores: Record<string, number> = {};

  private shoe = new ContentShoe('identity.all', []);
  private tilt = new TiltSensor();
  private timer = new Ticker();
  private countdownTimer = new Ticker();

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<WhoAmISettings>(KEY, DEFAULTS, (s) => ({
      seconds: num(s.seconds, DEFAULTS.seconds, 15, 180),
      laps: num(s.laps, DEFAULTS.laps, 1, 3),
      categoryID: categoryID(s.categoryID, (id) => IdentityBank.category(id) !== undefined),
      invertTilt: bool(s.invertTilt, DEFAULTS.invertTilt),
    }));
  }

  // MARK: - წარმოებული მნიშვნელობები

  get canPlay(): boolean {
    return this.players.length > 0;
  }
  get totalTurns(): number {
    return TurnRotation.rounds(this.settings.laps, this.players.length);
  }
  get turnNumber(): number {
    return this.turnIndex + 1;
  }
  get isLastTurn(): boolean {
    return this.turnNumber >= this.totalTurns;
  }
  get currentPlayer(): Player | null {
    if (this.players.length === 0) return null;
    return this.players[this.turnIndex % this.players.length];
  }

  get turnGuessed(): number {
    return this.results.filter((e) => e.verdict === 'guessed').length;
  }
  get turnPassed(): number {
    return this.results.filter((e) => e.verdict === 'passed').length;
  }

  scoreFor(player: Player): number {
    return this.scores[player.id] ?? 0;
  }

  liveScore(player: Player): number {
    const isCurrent = player.id === this.currentPlayer?.id;
    if (!isCurrent || (this.phase !== 'playing' && this.phase !== 'turnResult')) return this.scoreFor(player);
    return this.scoreFor(player) + this.turnGuessed;
  }

  get ranking(): Player[] {
    return [...this.players].sort((x, y) => {
      const a = this.scoreFor(x);
      const b = this.scoreFor(y);
      return a !== b ? b - a : x.name.localeCompare(y.name, 'ka');
    });
  }

  get champion(): Player | null {
    const best = this.ranking[0];
    return best && this.scoreFor(best) > 0 ? best : null;
  }

  get categoryLabel(): string {
    const cat = this.settings.categoryID ? IdentityBank.category(this.settings.categoryID) : undefined;
    return cat?.name ?? 'ყველა კატეგორია';
  }

  get podiumResults(): { player: Player; score: number }[] {
    return this.players.map((p) => ({ player: p, score: this.scoreFor(p) }));
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    if (!this.canPlay) return;
    this.shoe = new ContentShoe(
      `identity.${this.settings.categoryID ?? 'all'}`,
      IdentityBank.deck(this.settings.categoryID),
    );
    this.scores = {};
    this.turnIndex = 0;
    this.results = [];
    this.currentIdentity = '';
    this.flash = null;
    this.phase = 'turnIntro';
    this.notify();
  }

  beginTurn(): void {
    this.results = [];
    this.flash = null;
    this.remaining = this.settings.seconds;
    this.countdown = 3;
    this.phase = 'countdown';
    Screen.keepAwake();
    this.startCountdown();
    this.notify();
  }

  register(verdict: WhoAmIVerdict): void {
    if (this.phase !== 'playing') return;
    this.tilt.lockAfterManualInput();
    this.record(verdict);
  }

  clearFlash(): void {
    this.flash = null;
    this.notify();
  }

  flip(entry: WhoAmIEntry): void {
    const found = this.results.find((e) => e.id === entry.id);
    if (!found) return;
    found.verdict = found.verdict === 'guessed' ? 'passed' : 'guessed';
    this.notify();
  }

  finishTurn(): void {
    if (this.phase !== 'turnResult') return;

    const player = this.currentPlayer;
    if (player) this.scores[player.id] = (this.scores[player.id] ?? 0) + this.turnGuessed;
    this.results = [];
    this.currentIdentity = '';

    if (this.isLastTurn) {
      this.phase = 'summary';
      Haptics.success();
      Sound.play('correct');
    } else {
      this.turnIndex += 1;
      this.phase = 'turnIntro';
    }
    this.notify();
  }

  restart(): void {
    this.startGame();
  }
  backToSetup(): void {
    this.releaseScreen();
    this.phase = 'setup';
    this.notify();
  }
  abandon(): void {
    this.releaseScreen();
    this.phase = 'setup';
    this.notify();
  }

  releaseScreen(): void {
    this.timer.stop();
    this.countdownTimer.stop();
    this.tilt.stop();
    Screen.release();
  }

  handleScenePhase(active: boolean): void {
    if (this.phase !== 'playing') return;
    if (active) this.tilt.resume();
    else this.tilt.pause();
  }

  // MARK: - შიდა

  private record(verdict: WhoAmIVerdict): void {
    this.results.push({ id: uuid(), identity: this.currentIdentity, verdict, isOvertime: false });
    this.flash = { id: uuid(), verdict };
    // ტელეფონი შუბლზეა — მფლობელი ეკრანს ვერ ხედავს, ხმა და ვიბრაცია
    // მისთვის ერთადერთი დადასტურებაა, რომ პასუხი ჩაეთვალა.
    Sound.play(verdict === 'guessed' ? 'correct' : 'wrong');
    this.nextIdentity();
    this.notify();
  }

  private startCountdown(): void {
    this.countdownTimer.start(1, () => {
      if (this.countdown > 1) {
        this.countdown -= 1;
        Haptics.tap();
        this.notify();
      } else {
        this.countdownTimer.stop();
        this.beginPlaying();
      }
    });
  }

  private beginPlaying(): void {
    this.nextIdentity();
    this.phase = 'playing';
    Haptics.heavy();
    Sound.play('start');
    this.startTimer();
    this.startMotion();
    this.notify();
  }

  private nextIdentity(): void {
    this.currentIdentity = this.shoe.draw() ?? '—';
  }

  private startTimer(): void {
    this.timer.start(1, () => {
      this.remaining -= 1;
      if (this.remaining <= 3 && this.remaining > 0) {
        Haptics.tickHot();
        Sound.play('tickHot');
      }
      if (this.remaining <= 0) this.expire();
      else this.notify();
    });
  }

  private startMotion(): void {
    this.tilt.start((direction) => {
      if (this.phase !== 'playing') return;
      const forward: WhoAmIVerdict = this.settings.invertTilt ? 'passed' : 'guessed';
      const back: WhoAmIVerdict = this.settings.invertTilt ? 'guessed' : 'passed';
      this.record(direction === 'forward' ? forward : back);
    });
  }

  private expire(): void {
    this.releaseScreen();
    this.remaining = 0;
    this.flash = null;
    // ეკრანზე დარჩენილი სახელი შედეგში გადადის — ხშირად სწორედ ის არის სადავო.
    if (this.currentIdentity && this.currentIdentity !== '—') {
      this.results.push({ id: uuid(), identity: this.currentIdentity, verdict: 'passed', isOvertime: true });
    }
    this.currentIdentity = '';
    this.phase = 'turnResult';
    Haptics.error();
    Sound.play('wrong');
    this.notify();
  }

  // MARK: - პარამეტრები

  setSeconds(value: number): void {
    this.settings = { ...this.settings, seconds: Math.min(Math.max(15, value), 180) };
    this.persist();
  }
  setLaps(value: number): void {
    this.settings = { ...this.settings, laps: Math.min(Math.max(1, value), 3) };
    this.persist();
  }
  setCategory(id: string | null): void {
    this.settings = { ...this.settings, categoryID: id };
    this.persist();
  }
  setInvertTilt(on: boolean): void {
    this.settings = { ...this.settings, invertTilt: on };
    this.persist();
  }

  private persist(): void {
    saveSettings(KEY, this.settings);
    this.notify();
  }
}
