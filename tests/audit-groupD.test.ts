import { describe, it, expect, beforeEach } from 'vitest';
import { __resetForTests } from '../src/core/storage';
import type { Player } from '../src/core/roster';
import { WhoWroteEngine } from '../src/games/whowrote/engine';
import { TwoTruthsEngine } from '../src/games/twotruths/engine';

/** აუდიტი D — ორმაგი შეხება ქულას ორჯერ არ უნდა არიცხავდეს და რიგს არ უნდა ხტებოდეს. */

const NAMES = ['გიო', 'ნინო', 'ლაშა', 'მარი'];
let seq = 0;
const names = (n: number): Player[] => NAMES.slice(0, n).map((name) => ({ id: `d${seq++}`, name, score: 0 }));

beforeEach(() => __resetForTests());

describe('WhoWrote', () => {
  it('ორმაგი „მზადაა“ შემდეგ მწერალს არ გამოტოვებს', () => {
    const e = new WhoWroteEngine(names(3));
    e.startGame();
    e.beginWriting();
    e.revealScreen();
    expect(e.submitAnswer('პირველი')).toBe(true);
    expect(e.submitAnswer('პირველი')).toBe(false); // სტადია handoff-ია
    expect(e.writerIndex).toBe(1);
  });

  it('წაკითხვა → „შემდეგი“ → ახალი დავალება; ორმაგი შეხება არაფერს ცვლის', () => {
    const e = new WhoWroteEngine(names(3));
    e.startGame();
    e.beginWriting();
    for (const t of ['ა', 'ბ', 'გ']) { e.revealScreen(); e.submitAnswer(t); }
    expect(e.phase).toBe('reading');
    expect([...e.readingList].sort()).toEqual(['ა', 'ბ', 'გ']);
    e.next();
    expect(e.phase).toBe('intro');
    expect(e.answers).toEqual({});
    e.next(); // intro-ში — არაფერი
    expect(e.phase).toBe('intro');
  });
});

describe('TwoTruths', () => {
  it('ტყუილის გამხელა → „შემდეგი“ → შემდეგი ავტორი; ორმაგი შეხება რიგს არ ხტება', () => {
    const e = new TwoTruthsEngine(names(3));
    e.startGame();
    e.beginWriting();
    expect(e.submit(['ა', 'ბ', 'გ'], 0)).toBe(true);
    expect(e.phase).toBe('show');
    e.revealLie();
    expect(e.phase).toBe('reveal');
    e.next();
    e.next();
    expect(e.turnIndex).toBe(1);
    expect(e.phase).toBe('writeHandoff');
    expect(e.author).toBe(e.players[1]);
  });

  it('ერთნაირი ამბები უარყოფილია და submit ამას აბრუნებს', () => {
    const e = new TwoTruthsEngine(names(3));
    e.startGame();
    e.beginWriting();
    expect(TwoTruthsEngine.isValid(['ა', 'ა ', 'ბ'], 1)).toBe(false);
    expect(e.submit(['ა', 'ა', 'ბ'], 1)).toBe(false);
    expect(e.phase).toBe('write');
  });
});
