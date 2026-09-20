import { beforeEach, describe, expect, it } from 'vitest';
import { WavelengthEngine, type Side } from '../src/games/wavelength/engine';
import { __resetForTests } from '../src/core/storage';
const players = Array.from({ length: 6 }, (_, i) => ({ id: `w${i}`, name: `Player ${i}`, score: 0 }));
beforeEach(() => __resetForTests());
function play(e: WavelengthEngine, distance: number, side: Side = 'left') {
  e.readyForClue(); e.beginGuess(); e.readyToGuess(); e.target = 0.5;
  e.setGuess(0.5 + distance); e.lockGuess(); e.chooseSide(side); e.reveal();
}
describe('classic Wavelength on one phone', () => {
  it('starts two teams at 0 and 1 with at least two people each', () => {
    const e = new WavelengthEngine(players.slice(0, 4));
    e.movePlayer(players[0].id); expect(e.canPlay).toBe(false);
    e.startGame(); expect(e.phase).toBe('setup');
    e.movePlayer(players[0].id); e.startGame();
    expect(e.scores).toEqual([0, 1]); expect(e.goal).toBe(10); expect(e.guessers).toHaveLength(1);
    const fewer = new WavelengthEngine(players.slice(0, 3)); fewer.startGame(); expect(fewer.phase).toBe('setup');
  });
  it('requires handoff and the opposing guess before revealing, scores once', () => {
    const e = new WavelengthEngine(players); e.startGame();
    e.beginGuess(); expect(e.phase).toBe('pass');
    e.readyForClue(); e.beginGuess(); e.setGuess(0); e.lockGuess(); expect(e.phase).toBe('handoff');
    e.readyToGuess(); e.target = 0.5; e.setGuess(0.55); e.lockGuess(); expect(e.phase).toBe('side');
    e.setGuess(1); expect(e.guess).toBe(0.55);
    e.reveal(); expect(e.scores).toEqual([0, 1]);
    e.chooseSide('left'); expect(e.phase).toBe('locked');
    e.reveal(); e.reveal(); e.lockGuess(); expect(e.scores).toEqual([3, 2]);
  });
  it.each([[0, 4], [0.025, 4], [0.026, 3], [0.075, 3], [0.076, 2], [0.125, 2], [0.126, 0]])('distance %s awards %s including the better boundary score', (distance, points) => {
    const e = new WavelengthEngine(players); e.startGame(); play(e, distance);
    expect(e.lastPoints).toBe(points); expect(e.otherPoints).toBe(points === 4 ? 0 : 1);
  });
  it('checks both left and right and rejects the wrong side', () => {
    for (const [distance, side, score] of [[-0.1, 'right', 1], [-0.1, 'left', 0], [0.1, 'right', 0]] as const) {
      const e = new WavelengthEngine(players); e.startGame(); play(e, distance, side); expect(e.otherPoints).toBe(score);
    }
  });
  it('alternates teams and rotates clue givers within each team', () => {
    const e = new WavelengthEngine(players); e.startGame();
    for (const id of ['w0', 'w1', 'w2', 'w3']) { expect(e.clueGiver?.id).toBe(id); play(e, 0.4, 'right'); e.next(); }
  });
  it('gives a catch-up turn only on 4 points while still behind', () => {
    const e = new WavelengthEngine(players); e.startGame(); e.scores = [0, 8];
    play(e, 0); expect(e.catchUp).toBe(true); e.next();
    expect(e.activeTeam).toBe(0); expect(e.clueGiver?.id).toBe('w2');
    play(e, 0); expect(e.catchUp).toBe(false); e.next(); expect(e.activeTeam).toBe(1);
  });
  it('evaluates the 10-point goal after both teams score', () => {
    const e = new WavelengthEngine(players); e.startGame(); e.scores = [7, 9];
    play(e, 0.05); expect(e.scores).toEqual([10, 10]); expect(e.winner).toBeNull(); expect(e.tiebreak).toBe(true);
    const other = new WavelengthEngine(players); other.startGame(); other.scores = [0, 9];
    play(other, 0.4); expect(other.winner).toBe(1); other.next(); expect(other.phase).toBe('summary');
    expect(other.rewardFor(players[1])).toBe(3); expect(other.rewardFor(players[0])).toBe(1);
  });
  it('gives both teams a full tiebreak turn before choosing a winner', () => {
    const e = new WavelengthEngine(players); e.startGame(); e.scores = [8, 9]; play(e, 0.1); e.next();
    play(e, 0.05); expect(e.winner).toBeNull(); e.next();
    play(e, 0.1); expect(e.scores).toEqual([13, 14]); expect(e.winner).toBe(1);
  });
  it('repeats a tied tiebreak pair and resets for replay', () => {
    const e = new WavelengthEngine(players); e.startGame(); e.scores = [8, 9]; play(e, 0.1); e.next();
    for (let i = 0; i < 2; i++) { play(e, 0.4, 'right'); e.next(); }
    expect(e.winner).toBeNull(); expect(e.tiebreak).toBe(true); expect(e.phase).toBe('pass');
    e.restart(); expect(e.scores).toEqual([0, 1]); expect(e.tiebreak).toBe(false); expect(e.clueGiver?.id).toBe('w0');
  });
  it('clips valid guesses and ignores invalid input', () => {
    const e = new WavelengthEngine(players); e.startGame(); e.readyForClue(); e.beginGuess(); e.readyToGuess();
    e.setGuess(NaN); expect(e.guess).toBe(0.5); e.setGuess(-1); expect(e.guess).toBe(0); e.setGuess(2); expect(e.guess).toBe(1);
  });
});
