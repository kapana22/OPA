import { describe, it, expect, beforeEach } from 'vitest';
import { __resetForTests } from '../src/core/storage';
import type { Player } from '../src/core/roster';
import { StandardsEngine } from '../src/games/standards/engine';
import { TenButEngine } from '../src/games/tenbut/engine';
import { NeverEngine } from '../src/games/never/engine';
import { RuleCardEngine } from '../src/games/rulecard/engine';

/** აუდიტი (ჯგუფი E) — ორმაგი დაჭერა და ფაზის გარეთ მოქმედებები. */

let seq = 0;
const names = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: `e${seq++}`, name: `მოთამაშე ${i}`, score: 0 }));

beforeEach(() => __resetForTests());

describe('Standards — ბოლო ხმის ორმაგი დაჭერა', () => {
  it('შედეგის ფაზაში cast() ქულას მეორედ არ ითვლის', () => {
    const e = new StandardsEngine(names(3));
    e.startGame();
    e.beginVoting();
    e.cast('normal', 1); // მკითხავი, ზუსტი პროგნოზი
    e.cast('tooMuch');
    e.cast('tooMuch');
    expect(e.phase).toBe('result');
    const totals = { ...e.totals };
    e.cast('tooMuch');
    expect(e.totals).toEqual(totals);
    expect(e.tooMuchVotes).toBe(2);
  });
});

describe('TenBut — ბოლო პასუხის ორმაგი დაჭერა', () => {
  it('შედეგის ფაზაში submit() ქულას მეორედ არ ითვლის', () => {
    const e = new TenButEngine(names(3));
    e.startGame();
    e.beginRating();
    e.submit(5);
    e.submit(5);
    e.submit(5);
    expect(e.phase).toBe('result');
    const totals = { ...e.totals };
    e.submit(5);
    expect(e.totals).toEqual(totals);
  });
});

describe('Never — სხვა დებულება და ორმაგი „შემდეგი“', () => {
  it('skipStatement() მონიშვნებს აუქმებს და სიცოცხლეს აბრუნებს', () => {
    const players = names(3);
    const e = new NeverEngine(players);
    e.setLives(1);
    e.startGame();
    e.toggle(players[0]);
    expect(e.isOut(players[0])).toBe(true);
    e.skipStatement();
    expect(e.isMarked(players[0])).toBe(false);
    expect(e.livesLeft(players[0])).toBe(1);
    expect(e.outOrder).toEqual([]);
  });

  it('შეჯამებაზე next() აღარაფერს ცვლის', () => {
    const players = names(3);
    const e = new NeverEngine(players);
    e.setLives(1);
    e.startGame();
    e.toggle(players[0]);
    e.toggle(players[1]);
    e.next();
    expect(e.phase).toBe('summary');
    const round = e.round;
    e.next();
    expect(e.phase).toBe('summary');
    expect(e.round).toBe(round);
  });
});

describe('House Rules — შეჯამების შემდეგ მოქმედება არ ითვლება', () => {
  it('summary-ზე markDone()/removeRule() ფაზას არ ცვლის', () => {
    const e = new RuleCardEngine(names(2));
    e.startGame();
    e.finishNow();
    const drawn = e.drawn;
    e.markDone();
    expect(e.phase).toBe('summary');
    expect(e.drawn).toBe(drawn);
  });
});
