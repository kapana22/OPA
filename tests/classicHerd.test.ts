import { beforeEach, describe, expect, it } from 'vitest';
import { __resetForTests } from '../src/core/storage';
import { HerdEngine } from '../src/games/herd/engine';
import { DareCardEngine } from '../src/games/darecard/engine';
import { RuleCardEngine } from '../src/games/rulecard/engine';
const players = ['ა', 'ბ', 'გ', 'დ', 'ე'].map((name, i) => ({ id: String(i), name, score: 0 }));
beforeEach(() => __resetForTests());
describe('Herd — სიტყვიერი პასუხები, ქულების გარეშე', () => {
  it('ოთხი მოთამაშე სჭირდება; თამაში პირდაპირ კითხვით იწყება', () => {
    const short = new HerdEngine(players.slice(0, 3));
    short.startGame();
    expect(short.phase).toBe('setup');
    const e = new HerdEngine(players);
    e.startGame();
    expect(e.phase).toBe('question');
    expect(e.question).not.toBe('');
  });
  it('შემდეგი კითხვა იწყება პასუხების შეგროვებისა და დათვლის გარეშე', () => {
    const e = new HerdEngine(players);
    e.next();
    expect(e.phase).toBe('setup');
    e.startGame();
    const first = e.question;
    e.next();
    expect(e.phase).toBe('question');
    expect(e.round).toBe(2);
    expect(e.question).not.toBe(first);
  });
  it('გრძელდება თავისუფლად და მოთამაშეების საერთო ქულებს არ ცვლის', () => {
    const scored = players.map(p => ({ ...p, score: 5 }));
    const e = new HerdEngine(scored);
    e.startGame();
    for (let i = 0; i < 40; i++) e.next();
    expect(e.phase).toBe('question');
    expect(e.round).toBe(41);
    expect(scored.every(p => p.score === 5)).toBe(true);
    e.startGame();
    expect(e.round).toBe(1);
  });
});
describe('Do or Pay / House Rules — ქულების გარეშე', () => {
  it('ბარათი „შემდეგით“ მიდის, ჯარიმის ვარიანტებში „ქულა მინუსში“ აღარ არის', () => {
    const e = new DareCardEngine(players); e.setLaps(2); e.startGame();
    const first = e.drawn; e.next(); expect(e.drawn).toBe(first + 1);
    e.finishNow(); e.next(); expect(e.phase).toBe('summary');
    const r = new RuleCardEngine(players); r.startGame(); r.markDone(); expect(r.drawn).toBe(2);
  });
});
