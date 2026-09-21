import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { __resetForTests } from '../src/core/storage';
import type { Player } from '../src/core/roster';
import { AliasEngine } from '../src/games/alias/engine';
import { CharadesEngine } from '../src/games/charades/engine';
import { WhoAmIEngine } from '../src/games/whoami/engine';

/** აუდიტი (ჯგუფი A): ალიასი, შარადები, „ვინ ვარ მე?“. */

let seq = 0;
const names = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: `a${seq++}`, name: `P${i}`, score: 0 }));

beforeEach(() => {
  __resetForTests();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('beginTurn — ორმაგი დაჭერა ათვლას თავიდან არ იწყებს', () => {
  it('charades / whoami / alias', () => {
    for (const e of [new CharadesEngine(names(3)), new WhoAmIEngine(names(3))]) {
      e.startGame();
      e.beginTurn();
      vi.advanceTimersByTime(1000);
      expect(e.countdown).toBe(2);
      e.beginTurn();
      expect(e.countdown).toBe(2);
      e.releaseScreen();
    }
    const a = new AliasEngine(names(4));
    a.goToTeams();
    a.startMatch();
    a.beginTurn();
    vi.advanceTimersByTime(1000);
    a.beginTurn();
    expect(a.countdown).toBe(2);
    a.releaseScreen();
  });
});

describe('ფონში გასვლისას ჯერის დრო ჩერდება', () => {
  it('charades / whoami', () => {
    for (const e of [new CharadesEngine(names(2)), new WhoAmIEngine(names(2))]) {
      e.startGame();
      e.beginTurn();
      vi.advanceTimersByTime(3000);
      expect(e.phase).toBe('playing');
      const left = e.remaining;
      e.handleScenePhase(false);
      vi.advanceTimersByTime(10_000);
      expect(e.remaining).toBe(left);
      e.handleScenePhase(true);
      e.handleScenePhase(true); // დუბლიკატი ტაიმერს არ აორმაგებს
      vi.advanceTimersByTime(1000);
      expect(e.remaining).toBe(left - 1);
      e.releaseScreen();
    }
  });
});

describe('შეჯამება — ფრე ერთ ადგილს იყოფს', () => {
  it('champions და rankOf', () => {
    const players = names(3);
    const e = new CharadesEngine(players);
    e.scores = { [players[0].id]: 4, [players[1].id]: 4, [players[2].id]: 1 };
    expect(e.champions.map((p) => p.id).sort()).toEqual([players[0].id, players[1].id].sort());
    expect(players.map((p) => e.rankOf(p))).toEqual([1, 1, 3]);
    const w = new WhoAmIEngine(players);
    expect(w.champions).toEqual([]);
  });
});

describe('ალიასი — გადაყვანა ამხსნელის რიგს არ არღვევს', () => {
  it('წინა მოთამაშის გადაყვანისას იგივე ადამიანი რჩება შემდეგი', () => {
    const e = new AliasEngine(names(6));
    e.rebuildTeams(false);
    const team = e.teams[0];
    team.explainerIndex = 2;
    const next = team.memberIDs[2];
    e.movePlayerForward(team.memberIDs[0]);
    expect(e.explainer(e.teams[0])?.id).toBe(next);
  });
});
