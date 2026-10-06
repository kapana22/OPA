import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetForTests } from '../src/core/storage';
import { GamePause } from '../src/core/ticker';
import type { Player } from '../src/core/roster';
import { NoYesNoEngine } from '../src/games/noyesno/engine';
import { noYesNoQuestions } from '../src/games/noyesno/questions';

const players: Player[] = ['ნინო', 'ლუკა', 'მარი'].map((name, i) => ({ id: String(i), name, score: 0 }));
beforeEach(() => { __resetForTests(); vi.useFakeTimers(); });
afterEach(() => { GamePause.release('test'); vi.clearAllTimers(); vi.useRealTimers(); });
const playing = () => {
  const engine = new NoYesNoEngine(players);
  engine.startGame(); engine.beginTurn();
  return engine;
};

describe('No Yes No', () => {
  it('awards only judged answers, skips for free and rejects a stale double tap', () => {
    const e = playing();
    const first = e.questionVersion;
    e.answer(first); e.answer(first);
    expect(e.turnScore).toBe(1);
    const second = e.questionVersion;
    e.skip(second);
    expect(e.questionVersion).toBe(second + 1);
    expect(e.turnScore).toBe(1);
    e.forbidden(e.questionVersion);
    expect(e.phase).toBe('result');
    expect(e.endReason).toBe('forbidden');
    expect(e.totalFor(players[0])).toBe(1);
    e.forbidden(e.questionVersion); e.answer(e.questionVersion);
    vi.advanceTimersByTime(60000);
    expect(e.totalFor(players[0])).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('finishes at 30 seconds and cannot accept answers after the deadline', () => {
    const e = playing();
    vi.advanceTimersByTime(29000);
    expect(e.phase).toBe('playing');
    expect(e.remaining).toBe(1);
    e.answer(e.questionVersion);
    vi.advanceTimersByTime(1000);
    expect(e.remaining).toBe(0);
    expect(e.phase).toBe('result');
    expect(e.endReason).toBe('time');
    e.answer(e.questionVersion);
    expect(e.totalFor(players[0])).toBe(1);
  });

  it('pauses time and judging together, and abandon cancels unfinished scoring', () => {
    const e = playing();
    e.answer(e.questionVersion);
    vi.advanceTimersByTime(5000);
    GamePause.hold('test');
    e.answer(e.questionVersion); e.skip(e.questionVersion); e.forbidden(e.questionVersion);
    vi.advanceTimersByTime(45000);
    expect(e.remaining).toBe(25);
    expect(e.turnScore).toBe(1);
    expect(e.phase).toBe('playing');
    GamePause.release('test');
    vi.advanceTimersByTime(1000);
    expect(e.remaining).toBe(24);
    e.abandon();
    vi.advanceTimersByTime(60000);
    expect(e.totalFor(players[0])).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('gives every player equal answering and interviewing turns in all three rounds', () => {
    const e = new NoYesNoEngine(players);
    e.setRounds(3); e.startGame();
    const answered: string[] = []; const interviewed: string[] = [];
    for (let i = 0; i < 9; i++) {
      expect(e.phase).toBe('handoff');
      answered.push(e.currentPlayer!.id); interviewed.push(e.interviewer!.id);
      expect(e.interviewer!.id).not.toBe(e.currentPlayer!.id);
      e.next(); // Out-of-phase navigation must not skip a player.
      e.beginTurn(); e.setRounds(1); e.beginTurn();
      e.answer(e.questionVersion); e.forbidden(e.questionVersion); e.next(); e.next();
    }
    expect(e.phase).toBe('summary');
    for (const player of players) {
      expect(answered.filter(id => id === player.id)).toHaveLength(3);
      expect(interviewed.filter(id => id === player.id)).toHaveLength(3);
      expect(e.totalFor(player)).toBe(3);
    }
    expect(e.winners).toHaveLength(3);
    e.startGame();
    expect(e.phase).toBe('handoff');
    expect(e.totals).toEqual({});
    expect(e.turn).toBe(0);
    expect(e.rounds).toBe(3);
  });

  it('has no zero-score winner and requires two players', () => {
    const e = new NoYesNoEngine(players.slice(0, 1));
    e.startGame();
    expect(e.phase).toBe('setup');
    expect(e.winners).toEqual([]);
    for (const value of [0, 4, NaN, 1.5]) e.setRounds(value);
    expect(e.rounds).toBe(1);
  });

  it('loads separate editable questions without repeats until the deck is used', () => {
    expect(noYesNoQuestions.length).toBeGreaterThanOrEqual(40);
    expect(new Set(noYesNoQuestions.map(q => q.id)).size).toBe(noYesNoQuestions.length);
    expect(new Set(noYesNoQuestions.map(q => q.text)).size).toBe(noYesNoQuestions.length);
    expect(noYesNoQuestions.every(q => q.id && q.text.trim() && !/[—–]/.test(q.text))).toBe(true);
    const e = playing();
    const seen = new Set<string>();
    for (let i = 0; i < noYesNoQuestions.length; i++) {
      seen.add(e.question); e.skip(e.questionVersion);
    }
    expect(seen.size).toBe(noYesNoQuestions.length);
  });
});
