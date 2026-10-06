import { describe, it, expect, beforeEach } from 'vitest';
import { __resetForTests } from '../src/core/storage';
import type { Player } from '../src/core/roster';
import { SpyEngine } from '../src/games/spy/engine';
import { ImpostorEngine } from '../src/games/impostor/engine';

let seq = 0;
const names = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: `f${seq++}`, name: `მოთამაშე ${i + 1}`, score: 0 }));

beforeEach(() => __resetForTests());

describe('Spy — მისტერ უაითი', () => {
  it('ნაგულისხმევად გამორთულია; 4 მოთამაშეზე ვერ ჩაირთვება', () => {
    expect(new SpyEngine(names(6)).settings.includeMrWhite).toBe(false);
    const small = new SpyEngine(names(4));
    small.setIncludeMrWhite(true);
    expect(small.settings.includeMrWhite).toBe(false);
  });

  it('ჩართვა ჯაშუშების ლიმიტს ამცირებს, გამორთვა არჩეულ რაოდენობას აბრუნებს', () => {
    const e = new SpyEngine(names(5));
    e.setUndercoverCount(2);
    expect(e.settings.undercoverCount).toBe(2);
    e.setIncludeMrWhite(true);
    expect(e.maxUndercovers).toBe(1);
    expect(e.settings.undercoverCount).toBe(1);
    e.setIncludeMrWhite(false);
    expect(e.settings.undercoverCount).toBe(2);
  });

  it('ერთ მოთამაშეს სიტყვა არ აქვს და არასდროს იწყებს', () => {
    const e = new SpyEngine(names(6));
    e.setIncludeMrWhite(true);
    for (let i = 0; i < 20; i++) {
      e.startGame();
      const whites = e.playersWith('mrWhite');
      expect(whites).toHaveLength(1);
      expect(e.card(whites[0]).word).not.toBe(e.civilianWord);
      expect(e.card(whites[0]).isSpecial).toBe(true);
      expect(e.startingPlayerID).not.toBe(whites[0].id);
    }
  });

  it('გაძევებული მისტერ უაითი სწორი სიტყვით მარტო იგებს', () => {
    const e = new SpyEngine(names(6));
    e.setIncludeMrWhite(true);
    e.startGame();
    e.beginVoting();
    e.eliminate(e.playersWith('mrWhite')[0]);
    expect(e.phase).toBe('mrWhiteGuess');
    expect(e.mrWhiteOptions).toContain(e.civilianWord);
    expect(new Set(e.mrWhiteOptions).size).toBe(e.mrWhiteOptions.length);
    e.submitMrWhiteGuess(e.civilianWord);
    expect(e.winner).toBe('mrWhite');
    expect(e.phase).toBe('gameOver');
  });

  it('შეცდომისას თამაში გრძელდება, ვარაუდი შედეგზე ჩანს', () => {
    const e = new SpyEngine(names(6));
    e.setIncludeMrWhite(true);
    e.startGame();
    e.beginVoting();
    e.eliminate(e.playersWith('mrWhite')[0]);
    const wrong = e.mrWhiteOptions.find((w) => w !== e.civilianWord)!;
    e.submitMrWhiteGuess(wrong);
    expect(e.winner).toBeNull();
    expect(e.phase).toBe('roundResult');
    expect(e.mrWhiteGuess).toBe(wrong);
  });

  it('ჯაშუშის გაძევების შემდეგ ცოცხალი მისტერ უაითი მოქალაქეებს გამარჯვებას არ აძლევს', () => {
    const e = new SpyEngine(names(6));
    e.setIncludeMrWhite(true);
    e.startGame();
    e.beginVoting();
    e.eliminate(e.playersWith('undercover')[0]);
    expect(e.winner).toBeNull();
  });
});

describe('Impostor — კატეგორია და ბოლო შანსი', () => {
  const toDiscussion = (e: ImpostorEngine) => {
    e.startRound();
    for (let i = 0; i < e.players.length; i++) e.advanceReveal();
  };

  it('ნაგულისხმევად ორივე ჩართულია', () => {
    const e = new ImpostorEngine(names(5));
    expect(e.settings.impostorKnowsCategory).toBe(true);
    expect(e.settings.impostorCanGuess).toBe(true);
  });

  it('კატეგორიის გამორთვა იმპოსტორის ბარათიდან მინიშნებას აშორებს', () => {
    const e = new ImpostorEngine(names(5));
    e.startRound();
    expect(e.card(e.impostors[0]).hint).toBe(e.category.name);
    e.setKnowsCategory(false);
    expect(e.card(e.impostors[0]).hint).toBeNull();
  });

  it('დაიჭირეს → ვარიანტები → შედეგი ვარაუდით', () => {
    const e = new ImpostorEngine(names(5));
    toDiscussion(e);
    e.showResult();
    expect(e.phase).toBe('caughtCheck');
    e.impostorCaught();
    expect(e.phase).toBe('impostorGuess');
    expect(e.guessOptions).toContain(e.secretWord);
    e.submitGuess(e.secretWord);
    expect(e.phase).toBe('result');
    expect(e.guessedRight).toBe(true);
  });

  it('„არა“ პირდაპირ შედეგზე, ვარაუდის გარეშე', () => {
    const e = new ImpostorEngine(names(5));
    toDiscussion(e);
    e.showResult();
    e.impostorNotCaught();
    expect(e.phase).toBe('result');
    expect(e.impostorGuess).toBeNull();
    expect(e.guessedRight).toBe(false);
  });

  it('ბოლო შანსი გამორთულია — პასუხი მაშინვე', () => {
    const e = new ImpostorEngine(names(5));
    e.setCanGuess(false);
    toDiscussion(e);
    e.showResult();
    expect(e.phase).toBe('result');
  });

  it('ახალი რაუნდი წინა ვარაუდს შლის', () => {
    const e = new ImpostorEngine(names(5));
    toDiscussion(e);
    e.showResult();
    e.impostorCaught();
    e.submitGuess(e.guessOptions[0]);
    e.nextRound();
    expect(e.impostorGuess).toBeNull();
    expect(e.guessOptions).toEqual([]);
  });
});
