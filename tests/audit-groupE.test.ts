import { describe, it, expect, beforeEach } from 'vitest';
import { __resetForTests } from '../src/core/storage';
import type { Player } from '../src/core/roster';
import { NeverEngine } from '../src/games/never/engine';
import { RuleCardEngine } from '../src/games/rulecard/engine';

/** აუდიტი (ჯგუფი E) — ორმაგი დაჭერა და ფაზის გარეთ მოქმედებები. */

let seq = 0;
const names = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: `e${seq++}`, name: `მოთამაშე ${i}`, score: 0 }));

beforeEach(() => __resetForTests());

describe('Never — თითებზე, ტელეფონი მხოლოდ დებულებებს აჩვენებს', () => {
  it('„სხვა“ დებულებას ცვლის რაუნდის დახარჯვის გარეშე; შეჯამებაზე next() აღარაფერს ცვლის', () => {
    const e = new NeverEngine(names(3));
    e.startGame();
    e.skipStatement();
    expect(e.round).toBe(1);
    e.finish();
    expect(e.phase).toBe('summary');
    e.next();
    e.skipStatement();
    expect(e.phase).toBe('summary');
    expect(e.round).toBe(1);
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
