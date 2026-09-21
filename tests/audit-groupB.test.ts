import { describe, it, expect, beforeEach } from 'vitest';
import { __resetForTests } from '../src/core/storage';
import type { Player } from '../src/core/roster';
import { BombEngine } from '../src/games/bomb/engine';
import { WordRushEngine } from '../src/games/wordrush/engine';
import { NoLaughEngine } from '../src/games/nolaugh/engine';

/** აუდიტი (B ჯგუფი): ორმაგი შეხება და ჯერის რიგი. */

const NAMES = ['გიო', 'ნინო', 'ლაშა', 'მარი'];
let seq = 0;
const names = (n: number): Player[] =>
  NAMES.slice(0, n).map((name) => ({ id: `b${seq++}`, name, score: 0 }));

beforeEach(() => __resetForTests());

describe('სიტყვის რბოლა — ორმაგი შეხება', () => {
  it('endTurn() ქულას ერთხელ ითვლის, next() მოთამაშეს არ ტოვებს', () => {
    const [a, b, c] = names(3);
    const e = new WordRushEngine([a, b, c]);
    e.startGame();
    e.beginTurn();
    e.count();
    e.count();
    e.endTurn();
    e.endTurn();
    expect(e.totalFor(a)).toBe(2);
    e.next();
    e.next();
    expect(e.currentPlayer?.id).toBe(b.id);
    e.abandon();
  });
});

describe('არ გაიცინო — ორმაგი შეხება', () => {
  it('next() რაუნდს არ ტოვებს', () => {
    const [a, b, c] = names(3);
    const e = new NoLaughEngine([a, b, c]);
    e.startGame();
    e.beginRound();
    e.markLaughed();
    e.next();
    e.next();
    expect(e.round).toBe(2);
    expect(e.holder?.id).toBe(b.id);
    e.stop();
  });
});

describe('ბომბი — ახალი რაუნდი', () => {
  it('აფეთქებულის ადგილიდან იწყება და ორმაგი შეხება რაუნდს არ ტოვებს', () => {
    const [a, b, c] = names(3);
    const e = new BombEngine([a, b, c]);
    e.setLives(2);
    e.startGame();
    e.pass(); // ბომბი ნინოსთან
    (e as unknown as { explode(): void }).explode();
    expect(e.victim?.id).toBe(b.id);
    e.continueGame();
    e.continueGame();
    expect(e.round).toBe(2);
    expect(e.currentPlayer?.id).toBe(b.id);
    e.abandon();
  });

  it('გავარდნილის შემდეგ მისი მომდევნო იწყებს', () => {
    const [a, b, c] = names(3);
    const e = new BombEngine([a, b, c]);
    e.setLives(1);
    e.startGame();
    e.pass();
    (e as unknown as { explode(): void }).explode();
    e.continueGame();
    expect(e.currentPlayer?.id).toBe(c.id);
    e.abandon();
  });

  it('მოთამაშეების გარეშე `playing`-ში არ იჭედება', () => {
    const e = new BombEngine([]);
    e.startGame();
    (e as unknown as { explode(): void }).explode();
    expect(e.phase).toBe('gameOver');
  });
});
