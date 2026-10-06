import { describe, it, expect, beforeEach } from 'vitest';
import { __resetForTests } from '../src/core/storage';
import type { Player } from '../src/core/roster';
import { MafiaEngine } from '../src/games/mafia/engine';
import { WhoAmIEngine, type WhoAmIEntry } from '../src/games/whoami/engine';

/** პატარა, სტანდარტული ოფციები: ვინ ვარ მე — გამოტოვება; მაფია — „არავინ“, ექიმის წესი. */

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

describe('ვინ ვარ მე — გამოტოვება უფასოა', () => {
  it('გამოტოვება ქულას არ აკლებს; სადავოს შეცვლა ქულასაც ცვლის', () => {
    const e = new WhoAmIEngine(names(2));
    e.startGame();
    e.phase = 'turnResult';
    e.results = [entry('guessed'), entry('passed'), entry('passed'), entry('passed', true)];
    expect(e.turnScore).toBe(1);
    e.flip(e.results[1]);
    expect(e.turnScore).toBe(2);
    e.flip(e.results[1]);
    const p = e.currentPlayer!;
    e.finishTurn();
    expect(e.scoreFor(p)).toBe(1);
  });
});

function nightOf(e: MafiaEngine) {
  // წამყვანის რიგი: ქალაქი იძინებს → მაფია → ექიმი → დეტექტივი → დილა.
  return (target: Player, save: Player) => {
    e.sleepCity();
    e.nextNightStep();
    while (e.phase === 'night') {
      if (e.nightStep === 'mafia') e.mafiaChoose(target);
      else if (e.nightStep === 'doctor') e.doctorSave(save);
      else if (e.nightStep === 'detective') { e.detectiveCheck(save); e.detectiveDone(); }
      e.nextNightStep();
    }
  };
}

describe('მაფია — დილიდან პირდაპირ კენჭისყრა', () => {
  it('დილიდან პირდაპირ კენჭისყრაზე; ორმაგი შეხება არაფერს ცვლის', () => {
    const e = new MafiaEngine(names(6));
    e.startGame();
    e.phase = 'morning';
    e.beginVote();
    e.beginVote();
    expect(e.phase).toBe('dayVote');
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
    expect(e.phase).toBe('night');
    expect(e.votedOut).toBeNull();
    expect(e.eliminated.size).toBe(0);
    expect(e.winner).toBeNull();
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

    // ღამე 2: a აკრძალულია — შეხება არაფერს აკეთებს, ჯერი არ გადადის.
    expect(e.doctorExcluded).toEqual([a.id]);
    e.sleepCity();
    e.nextNightStep();
    e.mafiaChoose(a);
    e.nextNightStep();
    expect(e.nightStep).toBe('doctor');
    e.doctorSave(a);
    expect(e.awake).toBe(true); // ჯერი არ გადავიდა
    expect(e.savedID).toBeNull();
    e.doctorSave(b);
    expect(e.savedID).toBe(b.id);
    e.nextNightStep();
    expect(e.killed?.id).toBe(a.id);
    e.beginVote();
    e.voteNobody();

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
