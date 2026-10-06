import { Observable } from '../../core/observable';
import { shuffled } from '../../core/shuffle';
import { loadSettings, saveSettings, num, bool, discussionSeconds } from '../../core/settings';
import type { Player } from '../../core/roster';

/**
 * „მაფია“ — **აპი წამყვანია**: ღამით ტელეფონი მაგიდის შუაში დევს, ყველას
 * თვალები დახუჭული აქვს, აპი კი რიგრიგობით აღვიძებს მაფიას, ექიმს და
 * დეტექტივს (`narration.ts`). ტელეფონი წრეზე მხოლოდ როლების დარიგებისას გადადის.
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
  | 'night'     // ტელეფონი შუაში — აპი როლებს რიგრიგობით აღვიძებს
  | 'morning'   // ვინ დაიღუპა
  | 'discussion' // დღის განხილვა ტაიმერით — მხოლოდ თუ ტაიმერი ჩართულია
  | 'dayVote'   // ქალაქი მსჯელობს და ირჩევს, ვინ გააძევოს
  | 'dayResult' // ვინ გავიდა და რა როლი ჰქონდა
  | 'gameOver';

export type MafiaWinner = 'city' | 'mafia';

/** ღამის ნაბიჯი: `dusk` — ქალაქი იძინებს, მერე თითო როლი. */
export type NightStep = 'dusk' | 'mafia' | 'doctor' | 'detective';

export interface MafiaSettings {
  mafiaCount: number;
  includeDoctor: boolean;
  includeDetective: boolean;
  /** დღის განხილვის ტაიმერი; 0 = ტაიმერის გარეშე (პირდაპირ კენჭისყრაზე). */
  discussionSeconds: number;
}

/** განხილვის დროის არჩევანი; 0 — განხილვის ეკრანი არ ჩნდება. */
export const MAFIA_DISCUSSION_OPTIONS = [0, 120, 180, 300] as const;

/** პატარა კომპანიაში ყველა სპეციალური როლი ზედმეტია — ჩვეულებრივი მოქალაქე აღარ რჩება. */
export const DOCTOR_MIN_PLAYERS = 5;
export const DETECTIVE_MIN_PLAYERS = 6;

const KEY = 'splash.mafia.settings.v1';
const DEFAULTS: MafiaSettings = { mafiaCount: 1, includeDoctor: true, includeDetective: true, discussionSeconds: 0 };

export class MafiaEngine extends Observable {
  readonly players: Player[];
  settings: MafiaSettings;

  phase: MafiaPhase = 'setup';
  night = 1;
  roles: Record<string, MafiaRole> = {};
  eliminated = new Set<string>();

  revealIndex = 0;
  nightStep: NightStep = 'dusk';
  /** ამ ნაბიჯის როლს თვალები ახელილი აქვს; `false` — უკვე იძინებს (ან ქალაქი ჯერ არ დაძინებულა). */
  awake = false;

  mafiaTargetID: string | null = null;
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
      discussionSeconds: discussionSeconds(s.discussionSeconds, DEFAULTS.discussionSeconds),
    }));
    this.clampSettings();
  }

  // MARK: - წარმოებული

  get alive(): Player[] {
    return this.players.filter((p) => !this.eliminated.has(p.id));
  }
  get hasDoctor(): boolean {
    return this.settings.includeDoctor && this.players.length >= DOCTOR_MIN_PLAYERS;
  }
  get hasDetective(): boolean {
    return this.settings.includeDetective && this.players.length >= DETECTIVE_MIN_PLAYERS;
  }

  /** მაფია ქალაქზე მეტი ვერასდროს იქნება. */
  get maxMafia(): number {
    return Math.max(1, Math.floor((this.players.length - 1) / 3));
  }

  get currentRevealPlayer(): Player | null {
    return this.players[this.revealIndex] ?? null;
  }
  /** ამაღამ ვინ იღვიძებს — მკვდარი როლის ჯერი გამოიტოვება (როლი სიკვდილისას ცხადდება). */
  get nightSteps(): NightStep[] {
    const has = (role: MafiaRole) => this.alive.some((p) => this.roles[p.id] === role);
    const steps: NightStep[] = ['mafia'];
    if (has('doctor')) steps.push('doctor');
    if (has('detective')) steps.push('detective');
    return steps;
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

  // MARK: - თამაშის დაწყება

  startGame(): void {
    this.clampSettings();
    const pool = shuffled(this.players);
    this.roles = {};

    // ექიმი და დეტექტივი ნაგულისხმევად თამაშობენ, მაგრამ მხოლოდ საკმარის კომპანიაში.
    let i = 0;
    for (let n = 0; n < this.settings.mafiaCount && i < pool.length; n++) this.roles[pool[i++].id] = 'mafia';
    if (this.hasDoctor && i < pool.length) this.roles[pool[i++].id] = 'doctor';
    if (this.hasDetective && i < pool.length) this.roles[pool[i++].id] = 'detective';
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
    this.nightStep = 'dusk';
    // პირველ ღამეს ქალაქი ღილაკით იძინებს (ტელეფონი ჯერ შუაში უნდა დადონ);
    // მომდევნო ღამეებში ტელეფონი უკვე შუაშია — ქალაქი მაშინვე იძინებს.
    this.awake = this.night > 1;
    this.mafiaTargetID = null;
    this.lastSavedID = this.savedID;
    this.savedID = null;
    this.checkedID = null;
    this.checkResult = null;
    this.killedID = null;
    this.phase = 'night';
    this.notify();
  }

  /** ტელეფონი შუაშია — ქალაქი იძინებს. */
  sleepCity(): void {
    if (this.phase !== 'night' || this.nightStep !== 'dusk' || this.awake) return;
    this.awake = true; // dusk-ზე `awake` ნიშნავს „ქალაქი დაიძინა, ველოდებით“.
    this.notify();
  }

  /** შემდეგი როლი იღვიძებს; ბოლოს — დილა. ეკრანი იძახებს ძილის ფრაზის შემდეგ. */
  nextNightStep(): void {
    if (this.phase !== 'night') return;
    const atDusk = this.nightStep === 'dusk';
    if (atDusk ? !this.awake : this.awake) return;
    const steps = this.nightSteps;
    const next = atDusk ? steps[0] : steps[steps.indexOf(this.nightStep) + 1];
    if (next === undefined) {
      this.resolveNight();
      return;
    }
    this.nightStep = next;
    this.awake = true;
    this.notify();
  }

  private canAct(step: NightStep): boolean {
    return this.phase === 'night' && this.nightStep === step && this.awake;
  }

  mafiaChoose(target: Player): void {
    if (!this.canAct('mafia') || this.eliminated.has(target.id) || this.roleOf(target) === 'mafia') return;
    this.mafiaTargetID = target.id;
    this.awake = false;
    this.notify();
  }

  /** ვის ვერ აირჩევს ექიმი ამაღამ — წუხანდელ გადარჩენილს (კლასიკური წესი). */
  get doctorExcluded(): string[] {
    return this.lastSavedID ? [this.lastSavedID] : [];
  }

  doctorSave(target: Player): void {
    if (!this.canAct('doctor') || this.eliminated.has(target.id)) return;
    if (target.id === this.lastSavedID) return;
    this.savedID = target.id;
    this.awake = false;
    this.notify();
  }

  detectiveCheck(target: Player): void {
    // ერთი შემოწმება ღამეში — მეორე შეხება შედეგს არ ცვლის.
    if (!this.canAct('detective') || this.checkResult !== null) return;
    this.checkedID = target.id;
    this.checkResult = this.roleOf(target) === 'mafia';
    this.notify();
  }

  detectiveDone(): void {
    if (!this.canAct('detective') || this.checkResult === null) return;
    this.awake = false;
    this.notify();
  }

  private resolveNight(): void {
    const target = this.mafiaTargetID;
    if (target && target !== this.savedID) {
      this.killedID = target;
      this.eliminated.add(target);
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

  /** ქალაქმა დღეს არავინ გააძევა — პირდაპირ შემდეგი ღამე. */
  voteNobody(): void {
    if (this.phase !== 'dayVote') return;
    this.votedOutID = null;
    this.settleOrContinue(() => {
      this.night += 1;
      this.beginNight();
    });
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

  /** 0 = ტაიმერის გარეშე — განხილვის ეკრანი არ ჩნდება. */
  setDiscussionSeconds(value: number): void {
    this.settings = { ...this.settings, discussionSeconds: discussionSeconds(value, DEFAULTS.discussionSeconds) };
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
