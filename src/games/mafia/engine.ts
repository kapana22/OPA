import { Observable } from '../../core/observable';
import { shuffled } from '../../core/shuffle';
import { loadSettings, saveSettings, num, bool } from '../../core/settings';
import type { Player } from '../../core/roster';

/**
 * „მაფია“ — **წამყვანის გარეშე**: ღამეს აპი ატარებს, ტელეფონი წრეზე გადადის
 * და თითოეული თავის ქმედებას ფარულად ასრულებს.
 *
 * პორტი: `Splash/Games/Mafia/MafiaEngine.swift`.
 */

export type MafiaRole = 'civilian' | 'mafia' | 'doctor' | 'detective';

export const roleTitle: Record<MafiaRole, string> = {
  civilian: 'მოქალაქე',
  mafia: 'მაფია',
  doctor: 'ექიმი',
  detective: 'დეტექტივი',
};

/** SF Symbol-ის სახელები — `icon()` თარგმნის ამ პლატფორმისთვის. */
export const roleIcon: Record<MafiaRole, string> = {
  civilian: 'person.fill',
  mafia: 'scope',
  doctor: 'cross.case.fill',
  detective: 'magnifyingglass',
};

export type MafiaPhase =
  | 'setup'
  | 'reveal'    // როლების დარიგება
  | 'night'     // ტელეფონი წრეზე — თითოეული თავის ქმედებას ასრულებს
  | 'morning'   // ვინ დაიღუპა
  | 'discussion' // დღის განხილვა ტაიმერით — მხოლოდ თუ ტაიმერი ჩართულია
  | 'dayVote'   // ქალაქი ხმას აძლევს
  | 'dayResult' // ვინ გავიდა და რა როლი ჰქონდა
  | 'gameOver';

export type MafiaWinner = 'city' | 'mafia';

export interface MafiaSettings {
  mafiaCount: number;
  includeDoctor: boolean;
  includeDetective: boolean;
  /** დღის განხილვის ტაიმერი; 0 = ტაიმერის გარეშე (კლასიკა — პირდაპირ კენჭისყრაზე). */
  discussionSeconds: number;
}

const KEY = 'splash.mafia.settings.v1';
const DEFAULTS: MafiaSettings = { mafiaCount: 1, includeDoctor: true, includeDetective: true, discussionSeconds: 0 };
const DISCUSSION = [30, 600] as const;

export class MafiaEngine extends Observable {
  readonly players: Player[];
  settings: MafiaSettings;

  phase: MafiaPhase = 'setup';
  night = 1;
  roles: Record<string, MafiaRole> = {};
  eliminated = new Set<string>();

  revealIndex = 0;
  nightIndex = 0;

  mafiaVotes: Record<string, number> = {};
  savedID: string | null = null;
  /** წინა ღამეს გადარჩენილი — ექიმი მას ზედიზედ მეორე ღამეს ვერ აირჩევს. */
  lastSavedID: string | null = null;
  checkedID: string | null = null;
  checkResult: boolean | null = null;

  killedID: string | null = null;
  votedOutID: string | null = null;
  winner: MafiaWinner | null = null;

  constructor(players: Player[]) {
    super();
    this.players = players;
    this.settings = loadSettings<MafiaSettings>(KEY, DEFAULTS, (s) => ({
      mafiaCount: num(s.mafiaCount, DEFAULTS.mafiaCount, 1, 6),
      includeDoctor: bool(s.includeDoctor, DEFAULTS.includeDoctor),
      includeDetective: bool(s.includeDetective, DEFAULTS.includeDetective),
      discussionSeconds: s.discussionSeconds === 0 ? 0 : num(s.discussionSeconds, DEFAULTS.discussionSeconds, ...DISCUSSION),
    }));
    this.clampSettings();
  }

  // MARK: - წარმოებული

  get alive(): Player[] {
    return this.players.filter((p) => !this.eliminated.has(p.id));
  }
  /** მაფია ქალაქზე მეტი ვერასდროს იქნება. */
  get maxMafia(): number {
    return Math.max(1, Math.floor((this.players.length - 1) / 3));
  }

  get currentRevealPlayer(): Player | null {
    return this.players[this.revealIndex] ?? null;
  }
  get currentNightPlayer(): Player | null {
    return this.alive[this.nightIndex] ?? null;
  }

  roleOf(player: Player): MafiaRole {
    return this.roles[player.id] ?? 'civilian';
  }
  player(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }
  playersWith(role: MafiaRole): Player[] {
    return this.players.filter((p) => this.roles[p.id] === role);
  }

  get killed(): Player | null {
    return this.killedID ? (this.player(this.killedID) ?? null) : null;
  }
  get votedOut(): Player | null {
    return this.votedOutID ? (this.player(this.votedOutID) ?? null) : null;
  }
  get checked(): Player | null {
    return this.checkedID ? (this.player(this.checkedID) ?? null) : null;
  }

  get finalPoints(): Record<string, number> {
    if (this.winner === null) return {};
    const points: Record<string, number> = {};
    if (this.winner === 'city') {
      for (const p of this.players) if (this.roles[p.id] !== 'mafia') points[p.id] = 2;
    } else {
      for (const p of this.playersWith('mafia')) points[p.id] = 3;
    }
    return points;
  }

  get results(): { player: Player; score: number }[] {
    const points = this.finalPoints;
    return this.players.map((p) => ({ player: p, score: points[p.id] ?? 0 }));
  }

  // MARK: - თამაშის დაწყება

  startGame(): void {
    this.clampSettings();
    const pool = shuffled(this.players);
    this.roles = {};

    let i = 0;
    for (let n = 0; n < this.settings.mafiaCount && i < pool.length; n++) this.roles[pool[i++].id] = 'mafia';
    if (this.settings.includeDoctor && i < pool.length) this.roles[pool[i++].id] = 'doctor';
    if (this.settings.includeDetective && i < pool.length) this.roles[pool[i++].id] = 'detective';
    for (; i < pool.length; i++) this.roles[pool[i].id] = 'civilian';

    this.eliminated = new Set();
    this.night = 1;
    this.revealIndex = 0;
    this.winner = null;
    this.killedID = null;
    this.votedOutID = null;
    this.savedID = null;
    this.lastSavedID = null;
    this.phase = 'reveal';
    this.notify();
  }

  advanceReveal(): void {
    if (this.revealIndex + 1 < this.players.length) {
      this.revealIndex += 1;
      this.notify();
    } else {
      this.beginNight();
    }
  }

  // MARK: - ღამე

  private beginNight(): void {
    this.nightIndex = 0;
    this.mafiaVotes = {};
    this.lastSavedID = this.savedID;
    this.savedID = null;
    this.checkedID = null;
    this.checkResult = null;
    this.killedID = null;
    this.phase = 'night';
    this.notify();
  }

  /**
   * ღამის ქმედება მხოლოდ მაშინ მიიღება, თუ ტელეფონი ახლა ამ როლის მქონეს
   * უჭირავს. ორმაგი შეხება სხვაგვარად შემდეგ მოთამაშეს ჯერს გამოტოვებინებდა.
   * `actor` — ვინც ღილაკს დააჭირა (ეკრანი მას იცნობს); ძველი ეკრანის
   * დაგვიანებული შეხება ახალ მოთამაშეზე აღარ ითვლება.
   */
  private canAct(role: MafiaRole, actor?: Player): boolean {
    const current = this.currentNightPlayer;
    if (this.phase !== 'night' || !current || this.roleOf(current) !== role) return false;
    return actor === undefined || actor.id === current.id;
  }

  /** მოქალაქეს ღამით ქმედება არ აქვს — ტელეფონი მაინც გადადის, რომ როლი არ გაიცეს. */
  skipNightTurn(actor?: Player): void {
    if (!this.canAct('civilian', actor)) return;
    this.advanceNight();
  }

  mafiaChoose(target: Player, actor?: Player): void {
    if (!this.canAct('mafia', actor)) return;
    this.mafiaVotes[target.id] = (this.mafiaVotes[target.id] ?? 0) + 1;
    this.advanceNight();
  }

  /** ვის ვერ აირჩევს ექიმი ამაღამ — წუხანდელ გადარჩენილს (კლასიკური წესი). */
  get doctorExcluded(): string[] {
    return this.lastSavedID ? [this.lastSavedID] : [];
  }

  doctorSave(target: Player, actor?: Player): void {
    if (!this.canAct('doctor', actor)) return;
    if (target.id === this.lastSavedID) return;
    this.savedID = target.id;
    this.advanceNight();
  }

  detectiveCheck(target: Player, actor?: Player): void {
    // ერთი შემოწმება ღამეში — მეორე შეხება შედეგს არ ცვლის.
    if (!this.canAct('detective', actor) || this.checkResult !== null) return;
    this.checkedID = target.id;
    this.checkResult = this.roleOf(target) === 'mafia';
    this.notify();
  }

  detectiveDone(actor?: Player): void {
    if (!this.canAct('detective', actor) || this.checkResult === null) return;
    this.advanceNight();
  }

  private advanceNight(): void {
    if (this.nightIndex + 1 < this.alive.length) {
      this.nightIndex += 1;
      this.notify();
    } else {
      this.resolveNight();
    }
  }

  private resolveNight(): void {
    // ყველაზე მეტი ხმის მქონე მსხვერპლი; ფრეს შემთხვევაში შემთხვევითი.
    const values = Object.values(this.mafiaVotes);
    if (values.length > 0) {
      const best = Math.max(...values);
      const top = Object.keys(this.mafiaVotes).filter((id) => this.mafiaVotes[id] === best);
      const target = top[Math.floor(Math.random() * top.length)];
      if (target && target !== this.savedID) {
        this.killedID = target;
        this.eliminated.add(target);
      }
    }
    this.phase = 'morning';
    this.evaluate();
    this.notify();
  }

  // MARK: - დღე

  /** დილიდან — განხილვაზე (თუ ტაიმერი ჩართულია) ან პირდაპირ კენჭისყრაზე. */
  beginVote(): void {
    if (this.phase !== 'morning') return;
    this.settleOrContinue(() => {
      this.phase = this.settings.discussionSeconds > 0 ? 'discussion' : 'dayVote';
      this.notify();
    });
  }

  /** განხილვიდან კენჭისყრაზე — ცალკე მეთოდია, რომ ორმაგმა შეხებამ დილიდან განხილვა არ გამოტოვოს. */
  endDiscussion(): void {
    if (this.phase !== 'discussion') return;
    this.phase = 'dayVote';
    this.notify();
  }

  voteOut(player: Player): void {
    if (this.phase !== 'dayVote' || this.eliminated.has(player.id)) return;
    this.votedOutID = player.id;
    this.eliminated.add(player.id);
    this.phase = 'dayResult';
    this.evaluate();
    this.notify();
  }

  /** ქალაქმა დღეს არავინ გააძევა — შედეგის ეკრანი, მერე ღამე. */
  voteNobody(): void {
    if (this.phase !== 'dayVote') return;
    this.votedOutID = null;
    this.phase = 'dayResult';
    this.evaluate();
    this.notify();
  }

  continueGame(): void {
    if (this.phase !== 'dayResult') return;
    this.settleOrContinue(() => {
      this.night += 1;
      this.beginNight();
    });
  }

  restart(): void {
    this.startGame();
  }
  backToSetup(): void {
    this.phase = 'setup';
    this.notify();
  }

  // MARK: - გამარჯვების შემოწმება

  private evaluate(): void {
    const mafiaAlive = this.alive.filter((p) => this.roles[p.id] === 'mafia').length;
    const othersAlive = this.alive.length - mafiaAlive;

    // მხოლოდ გამარჯვებულს ვაფიქსირებთ — ფაზას არა: დილის/დღის შედეგის ეკრანი
    // ჯერ უნდა გამოჩნდეს (ვინ დაიღუპა, ვინ იყო), და მხოლოდ მერე დასასრული.
    if (mafiaAlive === 0) this.winner = 'city';
    else if (mafiaAlive >= othersAlive) this.winner = 'mafia';
  }

  /** შედეგის ეკრანიდან წინ — თუ თამაში უკვე გადაწყდა, დასასრულზე. */
  private settleOrContinue(next: () => void): void {
    if (this.winner !== null) {
      this.phase = 'gameOver';
      this.notify();
      return;
    }
    next();
  }

  // MARK: - პარამეტრები

  setMafiaCount(n: number): void {
    this.settings = { ...this.settings, mafiaCount: Math.min(Math.max(1, n), this.maxMafia) };
    this.persist();
  }
  setDoctor(on: boolean): void {
    this.settings = { ...this.settings, includeDoctor: on };
    this.persist();
  }
  setDetective(on: boolean): void {
    this.settings = { ...this.settings, includeDetective: on };
    this.persist();
  }

  /** 0 = ტაიმერის გარეშე — `DiscussionPanel` ამას იცნობს. */
  setDiscussionSeconds(value: number): void {
    this.settings = {
      ...this.settings,
      discussionSeconds: value === 0 ? 0 : num(value, DEFAULTS.discussionSeconds, ...DISCUSSION),
    };
    this.persist();
  }

  private clampSettings(): void {
    this.settings.mafiaCount = Math.min(Math.max(1, this.settings.mafiaCount), this.maxMafia);
  }

  private persist(): void {
    saveSettings(KEY, this.settings);
    this.notify();
  }
}
