import { Observable } from '../../core/observable';
import { ContentShoe } from '../../core/contentShoe';
import { Ticker } from '../../core/ticker';
import { Screen } from '../../core/screen';
import { shuffled } from '../../core/shuffle';
import { uuid } from '../../core/id';
import { loadSettings, saveSettings, num, bool, categoryID } from '../../core/settings';
import { getJSON, setJSON } from '../../core/storage';
import { CharadesBank } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import type { Player } from '../../core/roster';

/**
 * „ალიასი“ — გუნდები, ერთი ხსნის, დანარჩენები გამოიცნობენ.
 *
 * პარტია მთავრდება მხოლოდ **მთელი წრის ბოლოს**: თუ ზღვარს ორმა ერთდროულად
 * მიაღწია, ემატება დამატებითი წრე — თორემ რიგით პირველი გუნდი უპირატესობაში
 * იქნებოდა.
 *
 * პორტი: `Splash/Games/Alias/AliasEngine.swift`.
 */

export type AliasPhase = 'setup' | 'teams' | 'turnIntro' | 'countdown' | 'playing' | 'turnResult' | 'winner';
export type AliasVerdict = 'correct' | 'skipped';

export interface AliasEntry {
  id: string;
  word: string;
  verdict: AliasVerdict;
  isOvertime: boolean;
}

export interface AliasTeam {
  id: number;
  name: string;
  memberIDs: string[];
  score: number;
  explainerIndex: number;
}

export interface AliasFlash {
  id: string;
  verdict: AliasVerdict;
}

export interface AliasSettings {
  teamCount: number;
  seconds: number;
  target: number;
  categoryID: string | null;
  penalizeSkip: boolean;
}

interface SavedLayout {
  names: string[];
  members: string[][];
}

const KEY = 'splash.alias.settings.v1';
const TEAMS_KEY = 'splash.alias.teams.v1';
const DEFAULTS: AliasSettings = { teamCount: 2, seconds: 60, target: 50, categoryID: null, penalizeSkip: true };
/** ზღვრები ერთ ადგილას — ჩატვირთვაც და ეკრანიდან შეცვლაც ერთსა და იმავეს ამოწმებს. */
const LIMITS = { seconds: [15, 180], target: [10, 200] } as const;

export class AliasEngine extends Observable {
  static readonly defaultTeamNames = ['ცისფრები', 'ვარდისფრები', 'მწვანეები', 'ყვითლები'];

  players: Player[];
  settings: AliasSettings;

  teams: AliasTeam[] = [];
  phase: AliasPhase = 'setup';
  activeTeamIndex = 0;
  turnsPlayed = 0;
  currentWord = '';
  remaining = 0;
  countdown = 3;
  results: AliasEntry[] = [];
  winnerTeamID: number | null = null;
  flash: AliasFlash | null = null;
  /** ზღვარს ორმა ერთდროულად მიაღწია — ემატება დამატებითი წრე. */
  extraLap = false;

  private shoe = new ContentShoe('word.charades-all', []);
  private timer = new Ticker();
  private countdownTimer = new Ticker();

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<AliasSettings>(KEY, DEFAULTS, (s) => ({
      teamCount: num(s.teamCount, DEFAULTS.teamCount, 2, 4),
      seconds: num(s.seconds, DEFAULTS.seconds, ...LIMITS.seconds),
      target: num(s.target, DEFAULTS.target, ...LIMITS.target),
      categoryID: categoryID(s.categoryID, (id) => CharadesBank.category(id) !== undefined),
      penalizeSkip: bool(s.penalizeSkip, DEFAULTS.penalizeSkip),
    }));
    this.loadLayout();
  }

  // MARK: - წარმოებული მნიშვნელობები

  get maxTeams(): number {
    return Math.max(2, Math.min(4, Math.floor(this.players.length / 2)));
  }
  get canPlay(): boolean {
    return this.players.length >= 4;
  }
  get normalizedTeamCount(): number {
    return Math.min(Math.max(2, this.settings.teamCount), this.maxTeams);
  }
  get teamsAreValid(): boolean {
    return this.teams.length >= 2 && this.teams.every((t) => t.memberIDs.length >= 2);
  }

  get activeTeam(): AliasTeam | null {
    return this.teams[this.activeTeamIndex] ?? null;
  }
  get winnerTeam(): AliasTeam | null {
    return this.teams.find((t) => t.id === this.winnerTeamID) ?? null;
  }
  get lap(): number {
    return Math.floor(this.turnsPlayed / Math.max(1, this.teams.length)) + 1;
  }
  get isLastTurnOfLap(): boolean {
    return (this.turnsPlayed + 1) % Math.max(1, this.teams.length) === 0;
  }

  team(id: number): AliasTeam | undefined {
    return this.teams.find((t) => t.id === id);
  }

  members(team: AliasTeam): Player[] {
    return team.memberIDs.map((id) => this.players.find((p) => p.id === id)).filter((p): p is Player => !!p);
  }

  explainer(team: AliasTeam): Player | null {
    const list = this.members(team);
    if (list.length === 0) return null;
    return list[team.explainerIndex % list.length];
  }

  guessers(team: AliasTeam): Player[] {
    const list = this.members(team);
    if (list.length === 0) return [];
    const index = team.explainerIndex % list.length;
    return list.filter((_, i) => i !== index);
  }

  get turnCorrect(): number {
    return this.results.filter((e) => e.verdict === 'correct').length;
  }
  get turnSkipped(): number {
    return this.results.filter((e) => e.verdict === 'skipped').length;
  }

  /** დროის ამოწურვისას დარჩენილი სიტყვა ჯარიმას არ იწვევს. */
  get turnPenalty(): number {
    if (!this.settings.penalizeSkip) return 0;
    return this.results.filter((e) => e.verdict === 'skipped' && !e.isOvertime).length;
  }

  get turnScore(): number {
    return this.turnCorrect - this.turnPenalty;
  }

  liveScore(team: AliasTeam): number {
    const isActive = team.id === this.activeTeam?.id;
    if (!isActive || (this.phase !== 'playing' && this.phase !== 'turnResult')) return team.score;
    return team.score + this.turnScore;
  }

  get standings(): AliasTeam[] {
    return [...this.teams].sort((x, y) => {
      const a = this.liveScore(x);
      const b = this.liveScore(y);
      return a !== b ? b - a : x.id - y.id;
    });
  }

  /** ამ ჯერით პარტია მთავრდება? — ეკრანს სჭირდება, რომ დაძაბულობა აჩვენოს. */
  get turnEndsMatch(): boolean {
    if (!this.isLastTurnOfLap || !this.teams[this.activeTeamIndex]) return false;
    const scores = this.teams.map((t) => t.score);
    scores[this.activeTeamIndex] += this.turnScore;
    const best = Math.max(...scores);
    if (best < this.settings.target) return false;
    return scores.filter((s) => s === best).length === 1;
  }

  get categoryLabel(): string {
    const cat = this.settings.categoryID ? CharadesBank.category(this.settings.categoryID) : undefined;
    return cat?.name ?? 'ყველა კატეგორია';
  }

  // MARK: - გუნდები

  updatePlayers(list: Player[]): void {
    this.players = list;
    this.loadLayout();
    this.notify();
  }

  setTeamCount(count: number): void {
    this.settings = { ...this.settings, teamCount: Math.min(Math.max(2, count), this.maxTeams) };
    saveSettings(KEY, this.settings);
    this.rebuildTeams(false);
  }

  rebuildTeams(shuffle: boolean): void {
    const count = this.normalizedTeamCount;
    const pool = shuffle ? shuffled(this.players) : this.players;
    const buckets: string[][] = Array.from({ length: count }, () => []);
    pool.forEach((player, offset) => buckets[offset % count].push(player.id));

    const oldNames = this.teams.map((t) => t.name);
    this.teams = Array.from({ length: count }, (_, index) => ({
      id: index,
      name: oldNames[index] ?? AliasEngine.defaultTeamNames[index],
      memberIDs: buckets[index],
      score: 0,
      explainerIndex: 0,
    }));
    this.saveLayout();
    this.notify();
  }

  /** მოთამაშე შემდეგ გუნდში გადადის — შემადგენლობის ხელით გასწორება. */
  movePlayerForward(id: string): void {
    if (this.teams.length <= 1) return;
    const from = this.teams.findIndex((t) => t.memberIDs.includes(id));
    if (from === -1) return;

    this.teams[from].memberIDs = this.teams[from].memberIDs.filter((x) => x !== id);
    if (this.teams[from].explainerIndex >= this.teams[from].memberIDs.length) this.teams[from].explainerIndex = 0;

    const to = (from + 1) % this.teams.length;
    this.teams[to].memberIDs.push(id);
    this.saveLayout();
    this.notify();
  }

  renameTeam(id: number, newName: string): void {
    const team = this.teams.find((t) => t.id === id);
    if (!team) return;
    const trimmed = newName.trim();
    if (!trimmed) return;
    team.name = trimmed.slice(0, 18);
    this.saveLayout();
    this.notify();
  }

  // MARK: - თამაშის მიმდინარეობა

  goToTeams(): void {
    if (this.teams.length !== this.normalizedTeamCount) this.rebuildTeams(true);
    this.phase = 'teams';
    this.notify();
  }

  backToSetup(): void {
    this.phase = 'setup';
    this.notify();
  }

  backToTeams(): void {
    this.releaseScreen();
    this.phase = 'teams';
    this.notify();
  }

  startMatch(): void {
    if (!this.teamsAreValid) return;
    this.shoe = new ContentShoe(
      `word.${this.settings.categoryID ?? 'charades-all'}`,
      CharadesBank.deck(this.settings.categoryID),
    );
    for (const t of this.teams) t.score = 0;
    this.activeTeamIndex = 0;
    this.turnsPlayed = 0;
    this.extraLap = false;
    this.winnerTeamID = null;
    this.results = [];
    this.flash = null;
    this.currentWord = '';
    this.phase = 'turnIntro';
    this.notify();
  }

  restartMatch(): void {
    this.startMatch();
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

  register(verdict: AliasVerdict): void {
    if (this.phase !== 'playing') return;
    this.results.push({ id: uuid(), word: this.currentWord, verdict, isOvertime: false });
    this.flash = { id: uuid(), verdict };
    this.nextWord();
    this.notify();
  }

  clearFlash(): void {
    this.flash = null;
    this.notify();
  }

  flip(entry: AliasEntry): void {
    const found = this.results.find((e) => e.id === entry.id);
    if (!found) return;
    found.verdict = found.verdict === 'correct' ? 'skipped' : 'correct';
    this.notify();
  }

  finishTurn(): void {
    const team = this.teams[this.activeTeamIndex];
    if (this.phase !== 'turnResult' || !team) return;

    team.score += this.turnScore;
    const size = team.memberIDs.length;
    // ახსნა შემდეგ მოთამაშეს გადადის — ერთი და იგივე კაცი ვერ დაიკავებს რიგს.
    if (size > 0) team.explainerIndex = (team.explainerIndex + 1) % size;

    this.results = [];
    this.currentWord = '';
    this.turnsPlayed += 1;

    // პარტია მხოლოდ მთელი წრის ბოლოს მთავრდება.
    if (this.turnsPlayed % this.teams.length === 0) {
      this.extraLap = false;
      const best = Math.max(...this.teams.map((t) => t.score));
      if (best >= this.settings.target) {
        const leaders = this.teams.filter((t) => t.score === best);
        if (leaders.length === 1) {
          this.winnerTeamID = leaders[0].id;
          this.phase = 'winner';
          Haptics.success();
          Sound.play('correct');
          this.notify();
          return;
        }
        this.extraLap = true;
      }
    }

    this.activeTeamIndex = (this.activeTeamIndex + 1) % this.teams.length;
    this.phase = 'turnIntro';
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
    Screen.release();
  }

  // MARK: - შიდა

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
    this.notify();
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

  private nextWord(): void {
    this.currentWord = this.shoe.draw() ?? '—';
  }

  private expire(): void {
    this.timer.stop();
    this.remaining = 0;
    this.flash = null;
    // ეკრანზე დარჩენილი სიტყვა შედეგში გადადის — ხშირად სწორედ ის არის სადავო.
    if (this.currentWord && this.currentWord !== '—') {
      this.results.push({ id: uuid(), word: this.currentWord, verdict: 'skipped', isOvertime: true });
    }
    this.currentWord = '';
    Screen.release();
    this.phase = 'turnResult';
    Haptics.error();
    Sound.play('wrong');
    this.notify();
  }

  // MARK: - პარამეტრები

  setSeconds(value: number): void {
    this.settings = { ...this.settings, seconds: num(value, DEFAULTS.seconds, ...LIMITS.seconds) };
    this.persist();
  }
  setTarget(value: number): void {
    this.settings = { ...this.settings, target: num(value, DEFAULTS.target, ...LIMITS.target) };
    this.persist();
  }
  setCategory(id: string | null): void {
    this.settings = { ...this.settings, categoryID: id };
    this.persist();
  }
  setPenalizeSkip(on: boolean): void {
    this.settings = { ...this.settings, penalizeSkip: on };
    this.persist();
  }

  private persist(): void {
    saveSettings(KEY, this.settings);
    this.notify();
  }

  // MARK: - შემადგენლობის შენახვა

  private saveLayout(): void {
    const layout: SavedLayout = {
      names: this.teams.map((t) => t.name),
      members: this.teams.map((t) => [...t.memberIDs]),
    };
    setJSON(TEAMS_KEY, layout);
  }

  private loadLayout(): void {
    const desired = this.normalizedTeamCount;
    const saved = getJSON<SavedLayout | null>(TEAMS_KEY, null);

    if (!saved || !Array.isArray(saved.members) || saved.members.length !== desired) {
      this.rebuildTeams(true);
      return;
    }

    const known = new Set(this.players.map((p) => p.id));
    const buckets: string[][] = saved.members.map((list) =>
      (Array.isArray(list) ? list : []).filter((id) => known.has(id)),
    );

    // ახალი მოთამაშე ყველაზე პატარა გუნდში მიდის.
    const placed = new Set(buckets.flat());
    for (const player of this.players) {
      if (placed.has(player.id)) continue;
      let smallest = 0;
      for (let i = 1; i < buckets.length; i++) if (buckets[i].length < buckets[smallest].length) smallest = i;
      buckets[smallest].push(player.id);
      placed.add(player.id);
    }

    this.teams = buckets.map((memberIDs, index) => ({
      id: index,
      name: saved.names?.[index] ?? AliasEngine.defaultTeamNames[index],
      memberIDs,
      score: 0,
      explainerIndex: 0,
    }));
  }
}
