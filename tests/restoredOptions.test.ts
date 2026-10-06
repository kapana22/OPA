import { describe, it, expect, beforeEach } from 'vitest';
import { __resetForTests, setJSON } from '../src/core/storage';
import { discussionSeconds, discussionLabel } from '../src/core/settings';
import type { Player } from '../src/core/roster';
import { MafiaEngine } from '../src/games/mafia/engine';
import { ImpostorEngine } from '../src/games/impostor/engine';
import { SpyEngine } from '../src/games/spy/engine';
import { BombEngine, BOMB_FUSE_RANGES } from '../src/games/bomb/engine';
import { AliasEngine, type AliasEntry } from '../src/games/alias/engine';
import { WhoAmIEngine, whoAmITiltVerdict, type WhoAmIEntry } from '../src/games/whoami/engine';
import { CharadesEngine, tiltVerdict } from '../src/games/charades/engine';

/**
 * დაბრუნებული ოფციები: განხილვის ტაიმერი, ფითილის სიგრძე, გამოტოვების
 * ჯარიმა, დახრის შებრუნება და იმპოსტორის გამარჯვებული (კონფეტისთვის).
 */

const NAMES = ['გიო', 'ნინო', 'ლაშა', 'მარი', 'დათო', 'ანა'];
let seq = 0;
const names = (n: number): Player[] =>
  NAMES.slice(0, n).map((name) => ({ id: `r${seq++}`, name, score: 0 }));

beforeEach(() => __resetForTests());

describe('განხილვის ტაიმერი', () => {
  it('ნაგულისხმევად გამორთულია სამივე თამაშში', () => {
    expect(new MafiaEngine(names(6)).settings.discussionSeconds).toBe(0);
    expect(new ImpostorEngine(names(5)).settings.discussionTimer).toBe(0);
    expect(new SpyEngine(names(5)).settings.discussionTimer).toBe(0);
  });

  it('შენახულიდან ჩატვირთვა: 0, ზღვრები, უცნაური მნიშვნელობა', () => {
    expect(discussionSeconds(0)).toBe(0);
    expect(discussionSeconds(120)).toBe(120);
    expect(discussionSeconds(5)).toBe(30);
    expect(discussionSeconds(99999)).toBe(600);
    expect(discussionSeconds('abc')).toBe(0);
    expect(discussionSeconds(undefined)).toBe(0);
    expect(discussionLabel(0)).toBe('∞');
    expect(discussionLabel(180)).toBe('3:00');
  });

  it('იმპოსტორი/ჯაშუში: არჩევანი ინახება და ბრუნდება', () => {
    const e = new ImpostorEngine(names(5));
    e.setDiscussionSeconds(120);
    expect(new ImpostorEngine(names(5)).settings.discussionTimer).toBe(120);
    const s = new SpyEngine(names(5));
    s.setDiscussionSeconds(300);
    expect(new SpyEngine(names(5)).settings.discussionTimer).toBe(300);
    s.setDiscussionSeconds(0);
    expect(new SpyEngine(names(5)).settings.discussionTimer).toBe(0);
  });

  it('ძველი შენახული 180 (წინა ნაგულისხმევი) ტაიმერს არ რთავს', () => {
    setJSON('splash.impostor.settings.v1', { discussionSeconds: 180 });
    setJSON('splash.spy.settings.v1', { discussionSeconds: 120 });
    expect(new ImpostorEngine(names(5)).settings.discussionTimer).toBe(0);
    expect(new SpyEngine(names(5)).settings.discussionTimer).toBe(0);
  });

  it('მაფია: ტაიმერით დილა → განხილვა → კენჭისყრა', () => {
    const e = new MafiaEngine(names(6));
    e.setDiscussionSeconds(120);
    e.startGame();
    e.phase = 'morning';
    e.beginVote();
    expect(e.phase).toBe('discussion');
    e.beginVote(); // ორმაგი შეხება განხილვას არ გამოტოვებს
    expect(e.phase).toBe('discussion');
    e.endDiscussion();
    expect(e.phase).toBe('dayVote');
    e.endDiscussion();
    expect(e.phase).toBe('dayVote');
  });

  it('მაფია: ტაიმერის გარეშე დილიდან პირდაპირ კენჭისყრა', () => {
    const e = new MafiaEngine(names(6));
    e.startGame();
    e.phase = 'morning';
    e.beginVote();
    expect(e.phase).toBe('dayVote');
  });
});

describe('ბომბი — ფითილის სიგრძე', () => {
  it('ნაგულისხმევი — საშუალო (20–60)', () => {
    const e = new BombEngine(names(3));
    expect([e.settings.minSeconds, e.settings.maxSeconds]).toEqual([20, 60]);
    expect(BOMB_FUSE_RANGES.find(([, lo, hi]) => lo === 20 && hi === 60)?.[0]).toBe('საშუალო');
  });

  it('არჩეული შუალედი ინახება და ფითილი მასში ჯდება', () => {
    for (const [, lo, hi] of BOMB_FUSE_RANGES) {
      const e = new BombEngine(names(3));
      e.setRange(lo, hi);
      expect(new BombEngine(names(3)).settings).toMatchObject({ minSeconds: lo, maxSeconds: hi });
      for (let i = 0; i < 20; i++) {
        e.startGame();
        expect(e.fuseSeconds).toBeGreaterThanOrEqual(lo);
        expect(e.fuseSeconds).toBeLessThanOrEqual(hi);
        e.abandon();
      }
    }
  });

  it('ძველი/გაფუჭებული შენახული მნიშვნელობა უსაფრთხოდ იტვირთება', () => {
    setJSON('splash.bomb.settings.v1', { lives: 2, minSeconds: 'x', maxSeconds: 1000 });
    const e = new BombEngine(names(3));
    expect(e.settings).toMatchObject({ lives: 2, minSeconds: 20, maxSeconds: 300 });
  });
});

const aliasEntry = (verdict: AliasEntry['verdict'], isOvertime = false): AliasEntry => ({
  id: `a${seq++}`,
  word: 'x',
  verdict,
  isOvertime,
});
const whoEntry = (verdict: WhoAmIEntry['verdict'], isOvertime = false): WhoAmIEntry => ({
  id: `w${seq++}`,
  identity: 'x',
  verdict,
  isOvertime,
});

describe('გამოტოვების ჯარიმა', () => {
  it('ალიასი: ნაგულისხმევად გამორთულია; ჩართვისას −1 ყოველ გამოტოვებაზე', () => {
    const e = new AliasEngine(names(4));
    expect(e.settings.skipPenalty).toBe(false);
    e.results = [aliasEntry('correct'), aliasEntry('correct'), aliasEntry('skipped'), aliasEntry('skipped', true)];
    expect(e.turnScore).toBe(2);
    e.setSkipPenalty(true);
    expect(e.turnPenalty).toBe(1); // დროის ამოწურვისას დარჩენილი სიტყვა ჯარიმა არაა
    expect(e.turnScore).toBe(1);
    e.results.push(aliasEntry('skipped'), aliasEntry('skipped'));
    expect(e.turnScore).toBe(-1);
    expect(new AliasEngine(names(4)).settings.skipPenalty).toBe(true);
  });

  it('ვინ ვარ მე: ჯარიმა ქულაში აისახება', () => {
    const e = new WhoAmIEngine(names(2));
    expect(e.settings.skipPenalty).toBe(false);
    e.setSkipPenalty(true);
    e.startGame();
    e.phase = 'turnResult';
    e.results = [whoEntry('guessed'), whoEntry('guessed'), whoEntry('passed'), whoEntry('passed', true)];
    expect(e.turnScore).toBe(1);
    const p = e.currentPlayer!;
    e.finishTurn();
    expect(e.scoreFor(p)).toBe(1);
  });

  it('ძველი შენახული პარამეტრები ჯარიმის გარეშე იტვირთება', () => {
    setJSON('splash.alias.settings.v1', { teamCount: 3, skipPenalty: 'yes' });
    setJSON('splash.whoami.settings.v2', { seconds: 60 });
    expect(new AliasEngine(names(6)).settings.skipPenalty).toBe(false);
    expect(new WhoAmIEngine(names(2)).settings).toMatchObject({ seconds: 60, skipPenalty: false, invertTilt: false });
  });
});

describe('დახრის შებრუნება', () => {
  it('ნაგულისხმევად გამორთულია და ინახება', () => {
    const c = new CharadesEngine(names(2));
    expect(c.settings.invertTilt).toBe(false);
    c.setInvertTilt(true);
    expect(new CharadesEngine(names(2)).settings.invertTilt).toBe(true);
    const w = new WhoAmIEngine(names(2));
    expect(w.settings.invertTilt).toBe(false);
    w.setInvertTilt(true);
    expect(new WhoAmIEngine(names(2)).settings.invertTilt).toBe(true);
  });

  it('ჩართვისას მიმართულებები იცვლება', () => {
    expect(tiltVerdict('forward', false)).toBe('correct');
    expect(tiltVerdict('back', false)).toBe('skipped');
    expect(tiltVerdict('forward', true)).toBe('skipped');
    expect(tiltVerdict('back', true)).toBe('correct');
    expect(whoAmITiltVerdict('forward', false)).toBe('guessed');
    expect(whoAmITiltVerdict('forward', true)).toBe('passed');
    expect(whoAmITiltVerdict('back', true)).toBe('guessed');
  });
});

describe('იმპოსტორი — გამარჯვებული (კონფეტი)', () => {
  const revealAll = (e: ImpostorEngine) => {
    while (e.phase === 'reveal') e.advanceReveal();
    e.showResult();
  };
  const toCheck = (e: ImpostorEngine) => {
    e.startRound();
    revealAll(e);
  };

  it('დაიჭირეს და ვერ გამოიცნო — ჯგუფი; გამოიცნო — იმპოსტორი; ვერ დაიჭირეს — იმპოსტორი', () => {
    const e = new ImpostorEngine(names(5));
    toCheck(e);
    expect(e.winner).toBeNull();
    e.impostorCaught();
    e.submitGuess(e.guessOptions.find((w) => w !== e.secretWord)!);
    expect(e.winner).toBe('group');

    e.nextRound();
    revealAll(e);
    e.impostorCaught();
    e.submitGuess(e.secretWord);
    expect(e.winner).toBe('impostor');

    e.nextRound();
    revealAll(e);
    e.impostorNotCaught();
    expect(e.winner).toBe('impostor');
  });

  it('ბოლო შანსის გარეშე გამარჯვებული უცნობია', () => {
    const e = new ImpostorEngine(names(5));
    e.setCanGuess(false);
    toCheck(e);
    expect(e.phase).toBe('result');
    expect(e.winner).toBeNull();
  });
});
