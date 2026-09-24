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
  function withMrWhite(n: number) {
    const e = new SpyEngine(names(n));
    e.setIncludeMrWhite(true);
    e.startGame();
    return e;
  }

  it('მისტერ უაითი არასდროს იწყებს', () => {
    for (let i = 0; i < 60; i++) {
      const e = withMrWhite(5);
      expect(e.roleOf(e.startingPlayer!)).not.toBe('mrWhite');
    }
  });

  it('მისტერ უაითის მცდარი ვარიანტი შემდეგი რაუნდის შედეგზე აღარ ჩანს', () => {
    const e = withMrWhite(8);
    e.beginVoting();
    const white = e.playersWith('mrWhite')[0];
    e.eliminate(white);
    e.submitMrWhiteGuess(e.mrWhiteOptions.find((w) => w !== e.civilianWord)!);
    expect(e.phase).toBe('roundResult');
    expect(e.mrWhiteGuess).not.toBeNull();

    e.continueGame();
    e.beginVoting();
    e.eliminate(e.playersWith('civilian')[0]);
    expect(e.phase).toBe('roundResult');
    expect(e.mrWhiteGuess).toBeNull();
  });

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
    e.setCategory(cat.id);
    for (let i = 0; i < cat.words.length + 5; i++) {
      e.startRound();
      expect(e.category.words).toContain(e.secretWord);
    }
  });

  it('ორმაგი „შემდეგი რაუნდი“ რაუნდს ორჯერ არ ზრდის', () => {
    const e = new ImpostorEngine(names(5));
    e.startRound();
    e.beginVoting();
    e.accuse(e.players.find((p) => !e.isImpostor(p))!);
    e.nextRound();
    e.nextRound();
    expect(e.round).toBe(2);
  });
});

describe('Mafia — აუდიტის გასწორებები', () => {
  it('ორმაგი „ღამე დგება“ ღამეს ორჯერ არ ზრდის', () => {
    const e = new MafiaEngine(names(8));
    e.startGame();
    for (let i = 0; i < 8; i++) e.advanceReveal();
    while (e.phase === 'night') {
      const actor = e.currentNightPlayer!;
      const other = e.alive.find((p) => p.id !== actor.id && e.roleOf(p) !== 'mafia')!;
      const role = e.roleOf(actor);
      if (role === 'mafia') e.mafiaChoose(other, actor);
      else if (role === 'doctor') e.doctorSave(other, actor);
      else if (role === 'detective') { e.detectiveCheck(other, actor); e.detectiveDone(actor); }
      else e.skipNightTurn(actor);
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
