import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { __resetForTests } from '../src/core/storage';
import { Sound } from '../src/core/sound';
import type { Player } from '../src/core/roster';
import { CharadesEngine } from '../src/games/charades/engine';
import { WhoAmIEngine } from '../src/games/whoami/engine';
import { AliasEngine } from '../src/games/alias/engine';
import { BombEngine } from '../src/games/bomb/engine';
import { WordRushEngine } from '../src/games/wordrush/engine';
import { NoLaughEngine } from '../src/games/nolaugh/engine';

/** თამაშის ლოგიკის აუდიტი: ორმაგი შეხება, ბომბის მსხვერპლი, ფრე შეჯამებაში. */

let seq = 0;
const names = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: `g${seq++}`, name: `P${i}`, score: 0 }));

beforeEach(() => {
  __resetForTests();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('შარადები / „ვინ ვარ მე?“ — ორ პასუხს შორის მინიმალური შუალედი', () => {
  it('ორმაგი შეხება ერთ სიტყვად ითვლება, 0.6 წამის შემდეგ კი ისევ ითვლება', () => {
    const c = new CharadesEngine(names(2));
    const w = new WhoAmIEngine(names(2));
    for (const [e, yes] of [[c, 'correct'], [w, 'guessed']] as const) {
      e.startGame();
      e.beginTurn();
      vi.advanceTimersByTime(3000);
      expect(e.phase).toBe('playing');
      (e.register as (v: string) => void)(yes);
      (e.register as (v: string) => void)(yes);
      expect(e.results.length).toBe(1);
      vi.advanceTimersByTime(300);
      (e.register as (v: string) => void)(yes);
      expect(e.results.length).toBe(1);
      vi.advanceTimersByTime(300);
      (e.register as (v: string) => void)(yes);
      expect(e.results.length).toBe(2);
      e.releaseScreen();
    }
  });

  it('დახრის გზაც (`record`) იმავე შუალედს ემორჩილება', () => {
    const e = new CharadesEngine(names(2));
    e.startGame();
    e.beginTurn();
    vi.advanceTimersByTime(3000);
    const record = (e as unknown as { record(v: string): void }).record.bind(e);
    record('correct');
    record('skipped');
    expect(e.results.map((r) => r.verdict)).toEqual(['correct']);
    e.releaseScreen();
  });

  it('შეჯამებაზე `win` ჟღერს', () => {
    const play = vi.spyOn(Sound, 'play');
    const e = new CharadesEngine(names(1));
    e.setSeconds(15);
    e.startGame();
    e.beginTurn();
    vi.advanceTimersByTime(3000 + 15_000);
    expect(e.phase).toBe('turnResult');
    e.finishTurn();
    expect(e.phase).toBe('summary');
    expect(play).toHaveBeenLastCalledWith('win');
  });
});

describe('ალიასი — ორმაგი შეხება ორ ჯარიმას არ იძლევა', () => {
  it('register() შუალედის გარეშე ერთხელ ითვლება', () => {
    const a = new AliasEngine(names(4));
    a.setPenalizeSkip(true);
    a.goToTeams();
    a.startMatch();
    a.beginTurn();
    vi.advanceTimersByTime(3000);
    expect(a.phase).toBe('playing');
    a.register('skipped');
    a.register('skipped');
    expect(a.turnScore).toBe(-1);
    vi.advanceTimersByTime(600);
    a.register('correct');
    expect(a.results.length).toBe(2);
    a.releaseScreen();
  });
});

describe('ბომბი — აფეთქების შემდეგ მსხვერპლის შესწორება', () => {
  const explode = (e: BombEngine) => (e as unknown as { explode(): void }).explode();

  it('სიცოცხლე წინას უბრუნდება, არჩეულს აკლდება, რაუნდი მისგან იწყება', () => {
    const [a, b, c] = names(3);
    const e = new BombEngine([a, b, c]);
    e.setLives(2);
    e.startGame();
    e.pass(); // ტელეფონი უკვე b-ზეა, ბომბი კი a-ს ხელში აფეთქდა
    explode(e);
    expect(e.victim?.id).toBe(b.id);
    e.reassignVictim(a);
    expect(e.victim?.id).toBe(a.id);
    expect([e.livesLeft(a), e.livesLeft(b), e.livesLeft(c)]).toEqual([1, 2, 2]);
    e.continueGame();
    expect(e.currentPlayer?.id).toBe(a.id);
    e.abandon();
  });

  it('გავარდნილი თამაშში ბრუნდება, არჩეული კი გადის; შემდეგ რაუნდს მისი მომდევნო იწყებს', () => {
    const [a, b, c] = names(3);
    const e = new BombEngine([a, b, c]);
    e.setLives(1);
    e.startGame();
    e.pass(); // b
    explode(e);
    expect(e.alive.map((p) => p.id)).toEqual([a.id, c.id]);
    e.reassignVictim(c);
    expect(e.alive.map((p) => p.id)).toEqual([a.id, b.id]);
    e.continueGame();
    expect(e.currentPlayer?.id).toBe(a.id); // c-ს შემდეგ წრე a-ზე ბრუნდება
    e.abandon();
  });

  it('უკვე გავარდნილს ვერ მიაწერ; აფეთქების გარეშე არაფერს აკეთებს', () => {
    const [a, b, c] = names(3);
    const e = new BombEngine([a, b, c]);
    e.setLives(1);
    e.startGame();
    e.reassignVictim(b); // ჯერ არ აფეთქებულა
    expect(e.livesLeft(b)).toBe(1);
    explode(e); // a გავარდა
    e.continueGame();
    explode(e); // b გავარდა
    e.reassignVictim(a); // a უკვე გარეთაა
    expect(e.victim?.id).toBe(b.id);
    expect(e.livesLeft(a)).toBe(0);
    e.abandon();
  });
});

describe('სიტყვის რბოლა — კატეგორიის ცვლა ჯერზე ერთხელ', () => {
  it('მეორე ცვლა არ ხდება, შემდეგ ჯერზე ისევ შეიძლება', () => {
    const e = new WordRushEngine(names(2));
    e.setCategory(null);
    e.startGame();
    expect(e.canSwapCategory).toBe(true);
    e.swapCategory();
    const swapped = e.categoryName;
    expect(e.canSwapCategory).toBe(false);
    e.swapCategory();
    expect(e.categoryName).toBe(swapped);
    e.beginTurn();
    e.endTurn();
    e.next();
    expect(e.canSwapCategory).toBe(true);
    e.abandon();
  });
});

describe('შეჯამება — ფრე ერთ ადგილს იყოფს (სიტყვის რბოლა, არ გაიცინო)', () => {
  it('champions და rankOf', () => {
    const players = names(3);
    const w = new WordRushEngine(players);
    w.totals = { [players[0].id]: 2, [players[1].id]: 5, [players[2].id]: 5 };
    expect(w.champions.map((p) => p.id).sort()).toEqual([players[1].id, players[2].id].sort());
    expect(players.map((p) => w.rankOf(p))).toEqual([3, 1, 1]);

    const n = new NoLaughEngine(players);
    n.scores = { [players[0].id]: 4, [players[1].id]: 4 };
    expect(n.champions.map((p) => p.id).sort()).toEqual([players[0].id, players[1].id].sort());
    expect(players.map((p) => n.rankOf(p))).toEqual([1, 1, 3]);
    n.scores = {};
    expect(n.champions).toEqual([]);
  });
});

describe('არ გაიცინო — რაუნდის შედეგს ხმა აქვს', () => {
  it('გაიცინა → wrong, გაუძლო → correct', () => {
    const play = vi.spyOn(Sound, 'play');
    const [a, b] = names(2);
    const e = new NoLaughEngine([a, b]);
    e.setSeconds(15);
    e.startGame();
    e.beginRound();
    e.markLaughed();
    expect(play).toHaveBeenLastCalledWith('wrong');
    e.next();
    e.beginRound();
    vi.advanceTimersByTime(15_000);
    expect(e.verdict).toBe('survived');
    expect(play).toHaveBeenLastCalledWith('correct');
    e.stop();
  });
});
