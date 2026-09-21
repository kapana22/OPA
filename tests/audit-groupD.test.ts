import { describe, it, expect, beforeEach } from 'vitest';
import { __resetForTests } from '../src/core/storage';
import type { Player } from '../src/core/roster';
import { WhoWroteEngine } from '../src/games/whowrote/engine';
import { TwoTruthsEngine } from '../src/games/twotruths/engine';
import { PointOneEngine } from '../src/games/pointone/engine';
import { MostLikelyEngine } from '../src/games/mostlikely/engine';

/** აუდიტი D — ორმაგი შეხება ქულას ორჯერ არ უნდა არიცხავდეს და რიგს არ უნდა ხტებოდეს. */

const NAMES = ['გიო', 'ნინო', 'ლაშა', 'მარი'];
let seq = 0;
const names = (n: number): Player[] => NAMES.slice(0, n).map((name) => ({ id: `d${seq++}`, name, score: 0 }));
const sum = (t: Record<string, number>) => Object.values(t).reduce((a, b) => a + b, 0);

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

  it('ბოლო გამომცნობის ორმაგი შეხება რაუნდს ორჯერ არ ითვლის', () => {
    const e = new WhoWroteEngine(names(3));
    e.startGame();
    e.beginWriting();
    for (const t of ['ა', 'ბ', 'გ']) { e.revealScreen(); e.submitAnswer(t); }
    e.beginGuessing();
    for (let i = 0; i < 3; i++) { e.revealScreen(); e.submitGuess(e.guessOptions[0]); }
    expect(e.phase).toBe('result');
    const total = sum(e.totals);
    expect(total).toBe(6);
    e.submitGuess(e.players[0]);
    expect(sum(e.totals)).toBe(total);
    const round = e.round;
    e.next();
    e.next(); // intro-ში — არაფერი
    expect(e.round).toBe(round + 1);
  });
});

describe('TwoTruths', () => {
  it('ორმაგი შეხება ბოლო გამომცნობზე ქულას ორჯერ არ არიცხავს', () => {
    const e = new TwoTruthsEngine(names(3));
    e.startGame();
    e.beginWriting();
    expect(e.submit(['ა', 'ბ', 'გ'], 0)).toBe(true);
    for (let i = 0; i < 2; i++) { e.beginGuessing(); e.castGuess(e.displayPositionOf(0)); }
    expect(e.phase).toBe('result');
    const total = sum(e.totals);
    e.castGuess(0);
    expect(sum(e.totals)).toBe(total);
    e.next();
    e.next();
    expect(e.turnIndex).toBe(1);
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

describe('PointOne', () => {
  it('ბოლო რაუნდის ორმაგი „შედეგები“ ქულას ორჯერ არ არიცხავს', () => {
    const p = names(3);
    const e = new PointOneEngine(p);
    e.setCountdown(false);
    e.setRounds(3);
    e.startGame();
    for (let r = 0; r < 3; r++) { e.begin(); e.toggle(p[0]); e.next(); e.next(); }
    expect(e.phase).toBe('summary');
    expect(e.totalFor(p[0])).toBe(3);
    e.next();
    expect(e.totalFor(p[0])).toBe(3);
  });
});

describe('MostLikely', () => {
  it('სწრაფ რეჟიმში ორმაგი შეხება ერთ ქულას აძლევს', () => {
    const p = names(3);
    const e = new MostLikelyEngine(p);
    e.setMode('quick');
    e.startGame();
    e.beginVoting();
    e.pick(p[0]);
    e.pick(p[0]);
    expect(e.totalFor(p[0])).toBe(1);
  });

  it('ფარულ რეჟიმში ბოლო ხმის გამეორება შედეგს არ ცვლის', () => {
    const p = names(3);
    const e = new MostLikelyEngine(p);
    e.setMode('secret');
    e.startGame();
    e.beginVoting();
    p.forEach(() => e.castVote(p[1]));
    e.castVote(p[1]);
    expect(e.totalFor(p[1])).toBe(1);
    expect(e.votesFor(p[1])).toBe(3);
  });
});
