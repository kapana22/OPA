import { describe, it, expect, beforeEach } from 'vitest';
import { __resetForTests } from '../src/core/storage';
import type { Player } from '../src/core/roster';
import { MafiaEngine } from '../src/games/mafia/engine';
import { WhoAmIEngine, type WhoAmIEntry } from '../src/games/whoami/engine';

/** პატარა, სტანდარტული ოფციები: ვინ ვარ მე — ჯარიმა; მაფია — ტაიმერი, „არავინ“, ექიმის წესი. */

const NAMES = ['გიო', 'ნინო', 'ლაშა', 'მარი', 'დათო', 'ანა'];
let seq = 0;
const names = (n: number): Player[] =>
  NAMES.slice(0, n).map((name) => ({ id: `o${seq++}`, name, score: 0 }));

beforeEach(() => __resetForTests());

const entry = (verdict: WhoAmIEntry['verdict'], isOvertime = false): WhoAmIEntry => ({
  id: `e${seq++}`,
  identity: 'x',
  verdict,
  isOvertime,
});

describe('ვინ ვარ მე — ჯარიმა გამოტოვებაზე', () => {
  it('ნაგულისხმევად გამორთულია — გამოტოვება უფასოა', () => {
    const e = new WhoAmIEngine(names(2));
    expect(e.settings.penalizePass).toBe(false);
    e.startGame();
    e.phase = 'turnResult';
    e.results = [entry('guessed'), entry('passed'), entry('passed')];
    expect(e.turnScore).toBe(1);
    const p = e.currentPlayer!;
    e.finishTurn();
    expect(e.scoreFor(p)).toBe(1);
  });

  it('ჩართულზე −1 თითო გამოტოვებაზე, ბოლო (დროის) სახელი არ ჯარიმდება, ქულა უარყოფითიც შეიძლება', () => {
    const e = new WhoAmIEngine(names(2));
    e.setPenalizePass(true);
    expect(new WhoAmIEngine(names(2)).settings.penalizePass).toBe(true); // ინახება
    e.startGame();
    e.phase = 'turnResult';
    e.results = [entry('guessed'), entry('passed'), entry('passed'), entry('passed', true)];
    expect(e.turnPenalty).toBe(2);
    expect(e.turnScore).toBe(-1);
    const p = e.currentPlayer!;
    expect(e.liveScore(p)).toBe(-1);
    // სადავოს შეცვლა ქულასაც ცვლის
    e.flip(e.results[1]);
    expect(e.turnScore).toBe(1);
    e.flip(e.results[1]);
    e.finishTurn();
    expect(e.scoreFor(p)).toBe(-1);
    expect(e.champion).toBeNull();
  });
});

function nightOf(e: MafiaEngine) {
  // ყველა ცოცხალი თავის ჯერზე: მაფია → target, ექიმი → save, სხვები → გამოტოვება.
  return (target: Player, save: Player) => {
    while (e.phase === 'night') {
      const p = e.currentNightPlayer!;
      const role = e.roleOf(p);
      if (role === 'mafia') e.mafiaChoose(target, p);
      else if (role === 'doctor') e.doctorSave(save, p);
      else e.skipNightTurn(p);
    }
  };
}

describe('მაფია — დღის განხილვის ტაიმერი', () => {
  it('ნაგულისხმევად გამორთულია — დილიდან პირდაპირ კენჭისყრაზე', () => {
    const e = new MafiaEngine(names(6));
    expect(e.settings.discussionSeconds).toBe(0);
    e.startGame();
    e.phase = 'morning';
    e.beginVote();
    expect(e.phase).toBe('dayVote');
  });

  it('ჩართულზე ჯერ განხილვაა; ორმაგი შეხება დილიდან მას არ გამოტოვებს', () => {
    const e = new MafiaEngine(names(6));
    e.setDiscussionSeconds(180);
    expect(new MafiaEngine(names(6)).settings.discussionSeconds).toBe(180);
    e.startGame();
    e.phase = 'morning';
    e.beginVote();
    e.beginVote();
    expect(e.phase).toBe('discussion');
    e.endDiscussion();
    expect(e.phase).toBe('dayVote');
    e.setDiscussionSeconds(0);
    expect(new MafiaEngine(names(6)).settings.discussionSeconds).toBe(0);
  });
});

describe('მაფია — დღით „არავის ვაძევებთ“', () => {
  it('არავინ გადის, შემდეგ ღამე დგება', () => {
    const [m, d, a, b, c] = names(5);
    const e = new MafiaEngine([m, d, a, b, c]);
    e.startGame();
    e.roles = { [m.id]: 'mafia', [d.id]: 'doctor', [a.id]: 'civilian', [b.id]: 'civilian', [c.id]: 'civilian' };
    e.phase = 'dayVote';
    e.voteNobody();
    expect(e.phase).toBe('dayResult');
    expect(e.votedOut).toBeNull();
    expect(e.eliminated.size).toBe(0);
    expect(e.winner).toBeNull();
    e.continueGame();
    expect(e.phase).toBe('night');
    expect(e.night).toBe(2);
    e.voteNobody(); // ღამით არაფერს აკეთებს
    expect(e.phase).toBe('night');
  });
});

describe('მაფია — ექიმი ერთსა და იმავეს ზედიზედ ორ ღამეს ვერ გადაარჩენს', () => {
  it('წუხანდელი გადარჩენილი ამაღამ აკრძალულია, მესამე ღამეს — ისევ დაშვებული', () => {
    const [m, d, a, b, c, f] = names(6);
    const e = new MafiaEngine([m, d, a, b, c, f]);
    e.startGame();
    e.roles = {
      [m.id]: 'mafia', [d.id]: 'doctor', [a.id]: 'civilian', [b.id]: 'civilian', [c.id]: 'civilian', [f.id]: 'civilian',
    };
    for (let i = 0; i < 6; i++) e.advanceReveal();
    expect(e.doctorExcluded).toEqual([]);

    // ღამე 1: ექიმი a-ს არჩენს, მაფია a-ს ესვრის — გადარჩა.
    nightOf(e)(a, a);
    expect(e.killed).toBeNull();
    e.beginVote();
    e.voteNobody();
    e.continueGame();

    // ღამე 2: a აკრძალულია — შეხება არაფერს აკეთებს, ჯერი არ გადადის.
    expect(e.doctorExcluded).toEqual([a.id]);
    while (e.roleOf(e.currentNightPlayer!) !== 'doctor') {
      const p = e.currentNightPlayer!;
      if (e.roleOf(p) === 'mafia') e.mafiaChoose(a, p);
      else e.skipNightTurn(p);
    }
    const idx = e.nightIndex;
    e.doctorSave(a, d);
    expect(e.nightIndex).toBe(idx);
    expect(e.savedID).toBeNull();
    e.doctorSave(b, d);
    expect(e.savedID).toBe(b.id);
    nightOf(e)(a, b);
    expect(e.killed?.id).toBe(a.id);
    e.beginVote();
    e.voteNobody();
    e.continueGame();

    // ღამე 3: ახლა b აკრძალულია, a კი აღარ ცოცხლობს.
    expect(e.doctorExcluded).toEqual([b.id]);
  });

  it('ახალ პარტიაში წინა პარტიის აკრძალვა არ გადმოდის', () => {
    const [m, d, a, b] = names(4);
    const e = new MafiaEngine([m, d, a, b]);
    e.startGame();
    e.savedID = a.id;
    e.restart();
    for (let i = 0; i < 4; i++) e.advanceReveal();
    expect(e.doctorExcluded).toEqual([]);
  });
});
