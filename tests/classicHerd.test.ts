import { beforeEach, describe, expect, it } from 'vitest';
import { __resetForTests } from '../src/core/storage';
import { HerdEngine } from '../src/games/herd/engine';
import { DareCardEngine } from '../src/games/darecard/engine';
import { RuleCardEngine } from '../src/games/rulecard/engine';
const players = ['ა', 'ბ', 'გ', 'დ', 'ე'].map((name, i) => ({ id: String(i), name, score: 0 }));
beforeEach(() => __resetForTests());
function answer(e: HerdEngine, answers: string[]) {
  e.beginVoting();
  answers.forEach(value => { e.beginWriting(); e.submit(value); });
}
describe('Classic Herd', () => {
  it('requires four players and a private handoff before each answer', () => {
    const short = new HerdEngine(players.slice(0, 3)); short.startGame(); expect(short.phase).toBe('setup');
    const e = new HerdEngine(players); e.startGame(); e.submit('leak'); expect(e.answers).toEqual({});
    e.beginVoting(); e.beginWriting(); e.submit(''); expect(e.voterIndex).toBe(0);
    e.submit('კატა'); expect(e.phase).toBe('pass'); e.submit('ძაღლი'); expect(e.voterIndex).toBe(1);
    e.beginWriting(); e.hideAnswer(); expect(e.phase).toBe('pass');
  });
  it('scores largest matching group and passes the cow to the sole singleton', () => {
    const e = new HerdEngine(players); e.startGame(); answer(e, ['კატა', 'კატა', 'კატა', 'კატა', 'ძაღლი']);
    e.scoreRound(); expect(e.roundWinners).toHaveLength(4); expect(e.pinkCow).toBe('4');
    e.scoreRound(); expect(e.totalFor(players[0])).toBe(1);
    e.next(); answer(e, ['მზე', 'წვიმა', 'წვიმა', 'წვიმა', 'წვიმა']); e.scoreRound();
    expect(e.pinkCow).toBe('0'); expect(e.totalFor(players[4])).toBe(1);
  });
  it('ties award no points and multiple singletons leave the cow in place', () => {
    const e = new HerdEngine(players.slice(0, 4)); e.startGame(); e.pinkCow = '0';
    answer(e, ['ა', 'ა', 'ბ', 'ბ']); e.scoreRound(); expect(e.isTie).toBe(true); expect(e.roundWinners).toEqual([]); expect(e.pinkCow).toBe('0');
    e.next(); answer(e, ['ა', 'ბ', 'გ', 'დ']); e.scoreRound(); expect(e.pinkCow).toBe('0');
  });
  it('merges agreed equivalent answers and can undo before scoring', () => {
    const e = new HerdEngine(players); e.startGame(); answer(e, ['კატა', 'კატა ', 'ფისო', 'ძაღლი', 'ძაღლი']);
    expect(e.answerGroups).toHaveLength(3); e.mergeGroups(['კატა', 'ფისო']); expect(e.answerGroups).toHaveLength(2);
    e.resetGroups(); expect(e.answerGroups).toHaveLength(3); e.mergeGroups(['კატა', 'ფისო']); e.scoreRound();
    expect(e.roundWinners).toEqual(['0', '1', '2']);
  });
  it('cow blocks winning even at eight; moving it releases a winner with retained points', () => {
    const e = new HerdEngine(players); e.startGame(); e.totals = { '0': 7 }; e.pinkCow = '0';
    answer(e, ['ა', 'ა', 'ა', 'ბ', 'ბ']); e.scoreRound(); expect(e.totalFor(players[0])).toBe(8); expect(e.winners).toEqual([]);
    e.next(); answer(e, ['ა', 'ა', 'ა', 'ა', 'ბ']); e.scoreRound(); expect(e.winners).toEqual(['0']);
    e.next(); expect(e.phase).toBe('summary');
  });
  it('shares a simultaneous win and resets a new game', () => {
    const e = new HerdEngine(players); e.startGame(); e.totals = { '0': 7, '1': 7 };
    answer(e, ['ა', 'ა', 'ა', 'ბ', 'ბ']); e.scoreRound(); expect(e.winners).toEqual(['0', '1']);
    e.next(); e.startGame(); expect(e.totals).toEqual({}); expect(e.pinkCow).toBeNull(); expect(e.winners).toEqual([]);
  });
});
describe('Participant attribution and penalties', () => {
  it.each(['group', 'target'] as const)('%s records only chosen players with mixed outcomes', kind => {
    const e = new DareCardEngine(players); e.setCards(1); e.setForfeit('point'); e.startGame();
    e.currentCard = { text: 'test', kind, heat: 'family' };
    e.markDone(); expect(e.done).toEqual({});
    e.resolveParticipants({ '1': 'done', '3': 'forfeit', unknown: 'done' });
    expect(e.done).toEqual({ '1': 1 }); expect(e.forfeits).toEqual({ '3': 1 });
    expect(e.scoreFor(players[3])).toBe(-1); expect(e.scoreFor(players[0])).toBe(0);
    e.resolveParticipants({ '1': 'done' }); expect(e.doneCount(players[1])).toBe(1);
  });
  it('duel penalties affect the loser, and non-point forfeits do not reduce scores', () => {
    const e = new DareCardEngine(players); e.setCards(1); e.startGame();
    e.currentCard = { text: 'test', kind: 'duel', heat: 'family' }; e.rivalIndex = 1;
    e.resolveDuel(players[0]); expect(e.scoreFor(players[1])).toBe(0);
    e.setForfeit('point'); expect(e.results.find(r => r.player.id === '1')?.score).toBe(-1);
  });
  it('rule-card penalties subtract once per valid offender and affect ranking', () => {
    const e = new RuleCardEngine(players); e.setCards(1); e.setForfeit('point'); e.startGame();
    e.brought = { '0': 2, '1': 2 };
    e.finishForfeits([players[0], players[0], { id: 'outside', name: 'x', score: 0 }]);
    expect(e.scoreFor(players[0])).toBe(1); expect(e.ranking[0].id).toBe('1'); expect(e.forfeits).toEqual({ '0': 1 });
    e.finishForfeits([players[0]]); expect(e.scoreFor(players[0])).toBe(1);
  });
});
