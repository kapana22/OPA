import { describe, it, expect, beforeEach } from 'vitest';
import { __resetForTests } from '../src/core/storage';
import { WordBank } from '../src/content/banks';
import type { Player } from '../src/core/roster';
import { SpyEngine } from '../src/games/spy/engine';
import { ImpostorEngine } from '../src/games/impostor/engine';
import { MafiaEngine } from '../src/games/mafia/engine';

let seq = 0;
const names = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: `c${seq++}`, name: `მოთამაშე ${i + 1}`, score: 0 }));

beforeEach(() => __resetForTests());

describe('Spy — აუდიტის გასწორებები', () => {
  it('ორმაგი „შემდეგი რაუნდი“ რაუნდს ორჯერ არ ზრდის', () => {
    const e = new SpyEngine(names(8));
    e.startGame();
    e.beginVoting();
    e.eliminate(e.playersWith('civilian')[0]);
    e.continueGame();
    e.continueGame();
    expect(e.turn).toBe(2);
  });
});

describe('Impostor — აუდიტის გასწორებები', () => {
  it('ამოწურული კატეგორიიდან ბანკში გასული სიტყვა სწორ კატეგორიას აჩვენებს', () => {
    const cat = WordBank.categories[0];
    const e = new ImpostorEngine(names(5));
    e.setCategories([cat.id]);
    for (let i = 0; i < cat.words.length + 5; i++) {
      e.startRound();
      expect(e.category.words).toContain(e.secretWord);
    }
  });

  it('ორმაგი „შემდეგი რაუნდი“ რაუნდს ორჯერ არ ზრდის', () => {
    const e = new ImpostorEngine(names(5));
    e.setCanGuess(false);
    e.startRound();
    for (let i = 0; i < 5; i++) e.advanceReveal();
    e.showResult();
    e.nextRound();
    e.nextRound();
    expect(e.round).toBe(2);
  });

  it('განხილვა → showResult() → შედეგი; შედეგის გარეთ არაფერს აკეთებს', () => {
    const e = new ImpostorEngine(names(5));
    e.setCanGuess(false);
    e.startRound();
    e.showResult();
    expect(e.phase).toBe('reveal');
    for (let i = 0; i < 5; i++) e.advanceReveal();
    expect(e.phase).toBe('discussion');
    e.showResult();
    expect(e.phase).toBe('result');
    e.showResult();
    expect(e.phase).toBe('result');
  });
});

describe('Mafia — აუდიტის გასწორებები', () => {
  it('ორმაგი „ღამე დგება“ ღამეს ორჯერ არ ზრდის', () => {
    const e = new MafiaEngine(names(8));
    e.startGame();
    for (let i = 0; i < 8; i++) e.advanceReveal();
    e.sleepCity();
    e.nextNightStep();
    while (e.phase === 'night') {
      const other = e.alive.find((p) => e.roleOf(p) === 'civilian')!;
      if (e.nightStep === 'mafia') e.mafiaChoose(other);
      else if (e.nightStep === 'doctor') e.doctorSave(other);
      else if (e.nightStep === 'detective') { e.detectiveCheck(other); e.detectiveDone(); }
      e.nextNightStep();
    }
    e.beginVote();
    e.voteOut(e.alive.find((p) => e.roleOf(p) === 'civilian')!);
    if (e.winner !== null) return;
    e.continueGame();
    e.continueGame();
    expect(e.night).toBe(2);
    expect(e.phase).toBe('night');
  });
});
