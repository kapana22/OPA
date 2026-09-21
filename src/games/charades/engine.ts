import { Observable } from '../../core/observable';
import { WideningShoe } from '../../core/wideningShoe';
import { GamePause, Ticker } from '../../core/ticker';
import { TurnRotation } from '../../core/turnRotation';
import { TiltSensor } from '../../core/tiltSensor';
import { Screen } from '../../core/screen';
import { uuid } from '../../core/id';
import { loadSettings, saveSettings, num, bool, categoryID } from '../../core/settings';
import { CharadesBank } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import type { Player } from '../../core/roster';

/**
 * „ტელეფონი შუბლზე“ (Heads Up) — მაგიდა ხსნის, მფლობელი გამოიცნობს.
 * წინ დახრა — გამოიცანი, უკან — გამოტოვე.
 *
 * პორტი: `Splash/Games/Charades/CharadesEngine.swift`.
 */

export type CharadesPhase = 'setup' | 'turnIntro' | 'countdown' | 'playing' | 'turnResult' | 'summary';
export type CharadesVerdict = 'correct' | 'skipped';

export interface CharadesEntry {
  id: string;
  word: string;
  verdict: CharadesVerdict;
  /** დროის ამოწურვისას ეკრანზე დარჩენილი სიტყვა — ხშირად სწორედ ის არის სადავო. */
  isOvertime: boolean;
}

export interface CharadesFlash {
  id: string;
  verdict: CharadesVerdict;
}

export interface CharadesSettings {
  seconds: number;
  laps: number;
  categoryID: string | null;
  invertTilt: boolean;
}

const KEY = 'splash.charades.settings.v2'; // v1 ცალობით ჯერს ინახავდა
const DEFAULTS: CharadesSettings = { seconds: 60, laps: 1, categoryID: null, invertTilt: false };

export class CharadesEngine extends Observable {
  readonly players: Player[];
  settings: CharadesSettings;

  phase: CharadesPhase = 'setup';
  turnIndex = 0;
  currentWord = '';
  remaining = 0;
  countdown = 3;
  results: CharadesEntry[] = [];
  flash: CharadesFlash | null = null;
  scores: Record<string, number> = {};

  private shoe = new WideningShoe('word.charades-all', [], 'word.charades-all', []);
  private tilt = new TiltSensor();
  private timer = new Ticker();
  private countdownTimer = new Ticker();

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<CharadesSettings>(KEY, DEFAULTS, (s) => ({
      seconds: num(s.seconds, DEFAULTS.seconds, 15, 180),
      laps: num(s.laps, DEFAULTS.laps, 1, 3),
      categoryID: categoryID(s.categoryID, (id) => CharadesBank.category(id) !== undefined),
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

  get correctCount(): number {
    return this.results.filter((e) => e.verdict === 'correct').length;
  }
  get skippedCount(): number {
    return this.results.filter((e) => e.verdict === 'skipped').length;
  }

  scoreFor(player: Player): number {
    return this.scores[player.id] ?? 0;
  }

  /** ჯერის მიმდინარეობისას მიმდინარე მოთამაშის ქულა ცოცხლად იზრდება. */
  liveScore(player: Player): number {
    const isCurrent = player.id === this.currentPlayer?.id;
    if (!isCurrent || (this.phase !== 'playing' && this.phase !== 'turnResult')) return this.scoreFor(player);
    return this.scoreFor(player) + this.correctCount;
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

  /** ფრეზე ყველა პირველი — `PodiumAward`-იც ყველას +3-ს აძლევს. */
  get champions(): Player[] {
    const best = this.champion;
    if (!best) return [];
    const top = this.scoreFor(best);
    return this.ranking.filter((p) => this.scoreFor(p) === top);
  }

  /** სპორტული ადგილი: ერთნაირ ქულას ერთი ადგილი აქვს. */
  rankOf(player: Player): number {
    const score = this.scoreFor(player);
    return 1 + this.players.filter((p) => this.scoreFor(p) > score).length;
  }

  get categoryLabel(): string {
    const cat = this.settings.categoryID ? CharadesBank.category(this.settings.categoryID) : undefined;
    return cat?.name ?? 'ყველა კატეგორია';
  }

  get podiumResults(): { player: Player; score: number }[] {
    return this.players.map((p) => ({ player: p, score: this.scoreFor(p) }));
  }

  // MARK: - თამაშის მიმდინარეობა

  startGame(): void {
    if (!this.canPlay) return;
    // კატეგორია რომ ამოიწუროს, სიტყვები მთელი ბანკიდან მოდის — იგივე არ მეორდება.
    this.shoe = new WideningShoe(
      `word.${this.settings.categoryID ?? 'charades-all'}`,
      CharadesBank.deck(this.settings.categoryID),
      'word.charades-all',
      CharadesBank.all,
    );
    this.scores = {};
    this.turnIndex = 0;
    this.results = [];
    this.currentWord = '';
    this.flash = null;
    this.phase = 'turnIntro';
    this.notify();
  }

  beginTurn(): void {
    // ორმაგი დაჭერა ათვლას თავიდან არ იწყებს.
    if (this.phase !== 'turnIntro') return;
    this.results = [];
    this.flash = null;
    this.remaining = this.settings.seconds;
    this.countdown = 3;
    this.phase = 'countdown';
    Screen.keepAwake();
    this.startCountdown();
    this.notify();
  }

  /** ხელით დაფიქსირება — სენსორი ბლოკდება, თორემ იმავე მოძრაობა ორჯერ ჩაითვლება. */
  register(verdict: CharadesVerdict): void {
    if (this.phase !== 'playing') return;
    this.tilt.lockAfterManualInput();
    this.record(verdict);
  }

  clearFlash(): void {
    this.flash = null;
    this.notify();
  }

  /** შედეგების ეკრანზე სადავო სიტყვის გადაბრუნება. */
  flip(entry: CharadesEntry): void {
    const found = this.results.find((e) => e.id === entry.id);
    if (!found) return;
    found.verdict = found.verdict === 'correct' ? 'skipped' : 'correct';
    this.notify();
  }

  finishTurn(): void {
    if (this.phase !== 'turnResult') return;

    const player = this.currentPlayer;
    if (player) this.scores[player.id] = (this.scores[player.id] ?? 0) + this.correctCount;
    this.results = [];
    this.currentWord = '';

    if (this.isLastTurn) {
      // ვიბრაცია შეჯამების ეკრანზეა (`win`) — აქ მეორედ აღარ ზუზუნებს.
      this.phase = 'summary';
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

  /** აპი ფონში/წინა პლანზე — სენსორი ჩერდება და ნული თავიდან იზომება. */
  handleScenePhase(active: boolean): void {
    // ათვლაც ჩერდება — თორემ თამაში ფონში დაიწყებოდა და პირველი სიტყვა ჯიბეში გავიდოდა.
    if (this.phase === 'countdown') {
      if (!active) this.countdownTimer.stop();
      else if (!this.countdownTimer.isRunning) this.startCountdown();
      return;
    }
    if (this.phase !== 'playing') return;
    // დროც ჩერდება — ზარის ან ფონის დროს ჯერი არ უნდა იწვებოდეს.
    if (active) {
      this.tilt.resume();
      if (!this.timer.isRunning) this.startTimer();
    } else {
      this.tilt.pause();
      this.timer.stop();
    }
  }

  // MARK: - შიდა

  private record(verdict: CharadesVerdict): void {
    this.results.push({ id: uuid(), word: this.currentWord, verdict, isOvertime: false });
    this.flash = { id: uuid(), verdict };
    // ტელეფონი შუბლზეა — ეკრანს ვერ ხედავს, ვიბრაცია დადასტურებაა.
    if (verdict === 'correct') Haptics.success();
    else Haptics.medium();
    Sound.play(verdict === 'correct' ? 'correct' : 'wrong');
    this.nextWord();
    this.notify();
  }

  private startCountdown(): void {
    this.countdownTimer.start(1, () => {
      if (this.countdown > 1) {
        this.countdown -= 1;
        Haptics.tap();
        Sound.play('tick');
        this.notify();
      } else {
        this.countdownTimer.stop();
        this.beginPlaying();
      }
    });
  }

  private beginPlaying(): void {
    this.nextWord();
    this.phase = 'playing';
    Haptics.heavy();
    Sound.play('start');
    this.startTimer();
    this.startMotion();
    this.notify();
  }

  private nextWord(): void {
    this.currentWord = this.shoe.draw() ?? '—';
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
      // გასვლის დიალოგი ღიაა — ტელეფონი ხელშია და მისი დახრა პასუხად არ ჩაითვლება.
      if (this.phase !== 'playing' || GamePause.isPaused) return;
      const forward: CharadesVerdict = this.settings.invertTilt ? 'skipped' : 'correct';
      const back: CharadesVerdict = this.settings.invertTilt ? 'correct' : 'skipped';
      this.record(direction === 'forward' ? forward : back);
    });
  }

  private expire(): void {
    this.releaseScreen();
    this.remaining = 0;
    this.flash = null;
    // ეკრანზე დარჩენილი სიტყვა შედეგში გადადის.
    if (this.currentWord && this.currentWord !== '—') {
      this.results.push({ id: uuid(), word: this.currentWord, verdict: 'skipped', isOvertime: true });
    }
    this.currentWord = '';
    this.phase = 'turnResult';
    Haptics.error();
    Sound.play('boom');
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
