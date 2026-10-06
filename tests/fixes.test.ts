import { describe, it, expect, beforeEach } from 'vitest';
import { __resetForTests, setJSON } from '../src/core/storage';
import { CharadesBank } from '../src/content/banks';
import type { Player } from '../src/core/roster';
import { ImpostorEngine } from '../src/games/impostor/engine';
import { SpyEngine } from '../src/games/spy/engine';
import { MafiaEngine } from '../src/games/mafia/engine';
import { MostLikelyEngine } from '../src/games/mostlikely/engine';
import { TwoTruthsEngine } from '../src/games/twotruths/engine';
import { WordRushEngine } from '../src/games/wordrush/engine';
import { BombEngine } from '../src/games/bomb/engine';

/**
 * QA-მიმოხილვის ხარვეზები — თითოეული ტესტი ერთ გასწორებულ შემთხვევას იცავს,
 * რომ უკან არ დაბრუნდეს.
 */

const NAMES = ['გიო', 'ნინო', 'ლაშა', 'მარი', 'დათო', 'ანა'];
let seq = 0;
const names = (n: number): Player[] =>
  NAMES.slice(0, n).map((name) => ({ id: `p${seq++}`, name, score: 0 }));

beforeEach(() => __resetForTests());

describe('Undercover — გამარჯვება გუნდს ერგება', () => {
  it('ჯაშუშები მოქალაქეებს გაუთანაბრდნენ — ჯაშუშები იგებენ', () => {
    const [u1, u2, c1, c2, c3] = names(5);
    const e = new SpyEngine([u1, u2, c1, c2, c3]);
    e.roles = { [u1.id]: 'undercover', [u2.id]: 'undercover', [c1.id]: 'civilian', [c2.id]: 'civilian', [c3.id]: 'civilian' };
    e.eliminated = new Set([u1.id, c1.id, c2.id]); // დარჩა: ერთი ჯაშუში და ერთი მოქალაქე
    (e as unknown as { evaluate(): void }).evaluate();
    expect(e.winner).toBe('undercovers');
    expect(e.phase).toBe('gameOver');
  });
});

describe('Mafia — გადამწყვეტი შედეგის ეკრანი არ იკარგება', () => {
  it('მაფიის გაძევება ჯერ დღის შედეგს აჩვენებს, დასასრული მერე მოდის', () => {
    const [m, a, b, c] = names(4);
    const e = new MafiaEngine([m, a, b, c]);
    e.startGame();
    e.roles = { [m.id]: 'mafia', [a.id]: 'civilian', [b.id]: 'civilian', [c.id]: 'civilian' };
    e.phase = 'dayVote'; // კენჭისყრაზე პირდაპირ — ღამე ამ ტესტს არ აინტერესებს
    e.voteOut(m);
    expect(e.phase).toBe('dayResult');
    expect(e.votedOut?.id).toBe(m.id);
    expect(e.winner).toBe('city');
    e.continueGame();
    expect(e.phase).toBe('gameOver');
  });
});

describe('Most Likely To — შენახული პარამეტრები სუფთავდება', () => {
  it('გაუქმებული კატეგორია ნაგულისხმევზე ბრუნდება', () => {
    setJSON('splash.mostlikely.settings.v1', { mode: 'weird', rounds: 0, categoryID: 'no-such-category' });
    const e = new MostLikelyEngine(names(3));
    expect(e.settings).not.toHaveProperty('rounds');
    expect(e.settings.categoryIDs).toEqual([]);
    expect(e.settings).not.toHaveProperty('mode');
  });
});

describe('ორი სიმართლე — სამი ერთნაირი ამბავი არ მიიღება', () => {
  it('submit() ერთნაირ სტრიქონებს უარყოფს, განსხვავებულს — იღებს', () => {
    const e = new TwoTruthsEngine(names(3));
    e.startGame();
    e.beginWriting();
    e.submit(['ერთი', 'ერთი', 'ერთი'], 0);
    expect(e.statements.every((s) => s === '')).toBe(true);
    e.submit(['ერთი', 'ორი', 'სამი'], 1);
    expect(e.statements).toEqual(['ერთი', 'ორი', 'სამი']);
  });
});

describe('სიტყვის რბოლა — ფიქსირებული კატეგორია არ იცვლება', () => {
  it('swapCategory() არაფერს აკეთებს და დასტიდან სიტყვას არ ხარჯავს', () => {
    const e = new WordRushEngine(names(3));
    e.setCategories([CharadesBank.categories[0].id]);
    e.startGame();
    const starter = e.starter;
    expect(e.canSwapCategory).toBe(false);
    e.swapCategory();
    expect(e.starter).toBe(starter);
    e.setCategories([]);
    expect(e.canSwapCategory).toBe(true);
  });
});

describe('ბომბი — ფიტილის გახურება ერთხელ ირთვება', () => {
  it('isHot ახალ რაუნდზე ნულდება', () => {
    const e = new BombEngine(names(3));
    expect(e.isHot).toBe(false);
    e.isHot = true;
    e.startGame();
    expect(e.isHot).toBe(false);
  });
});

// ── თამაშების ლოგიკის მეორე აუდიტი

describe('Impostor — სამართლიანი რაუნდი', () => {
  it('იმპოსტორი არასდროს იწყებს', () => {
    const e = new ImpostorEngine(names(6));
    e.setImpostorCount(2);
    for (let i = 0; i < 40; i++) {
      e.startRound();
      expect(e.isImpostor(e.startingPlayer!)).toBe(false);
    }
  });
});

describe('Mafia — აპი წამყვანია, ღამე როლების რიგით', () => {
  it('ქმედება მხოლოდ გაღვიძებულ როლზე მიიღება; ორმაგი შეხება ვერაფერს ცვლის', () => {
    const [m, d, a, b] = names(4);
    const e = new MafiaEngine([m, d, a, b]);
    e.startGame();
    e.roles = { [m.id]: 'mafia', [d.id]: 'doctor', [a.id]: 'civilian', [b.id]: 'civilian' };
    for (let i = 0; i < 4; i++) e.advanceReveal();
    expect(e.nightStep).toBe('dusk');
    e.mafiaChoose(a); // ქალაქს ჯერ არ სძინავს
    expect(e.mafiaTargetID).toBeNull();
    e.sleepCity();
    e.nextNightStep();
    expect(e.nightStep).toBe('mafia');
    e.doctorSave(b); // ექიმის ჯერი არაა
    expect(e.savedID).toBeNull();
    e.mafiaChoose(m); // მაფია თავისიანს ვერ აირჩევს
    expect(e.mafiaTargetID).toBeNull();
    e.mafiaChoose(a);
    e.mafiaChoose(b); // უკვე იძინებს
    expect(e.mafiaTargetID).toBe(a.id);
    e.nextNightStep();
    expect(e.nightStep).toBe('doctor'); // დეტექტივი არ არის — მისი ჯერი არც ჩანს
    e.doctorSave(b);
    e.nextNightStep();
    expect(e.phase).toBe('morning');
    expect(e.killed?.id).toBe(a.id);
  });

  it('მკვდარი როლის ჯერი გამოიტოვება, ექიმის გადარჩენა მოქმედებს', () => {
    const [m, d, a, b] = names(4);
    const e = new MafiaEngine([m, d, a, b]);
    e.startGame();
    e.roles = { [m.id]: 'mafia', [d.id]: 'doctor', [a.id]: 'civilian', [b.id]: 'civilian' };
    for (let i = 0; i < 4; i++) e.advanceReveal();
    e.sleepCity(); e.nextNightStep();
    e.mafiaChoose(a); e.nextNightStep();
    e.doctorSave(a); e.nextNightStep();
    expect(e.killed).toBeNull();
    e.eliminated.add(d.id);
    expect(e.nightSteps).toEqual(['mafia']);
  });
});

describe('ორი სიმართლე — ჯერი წრეზე ტრიალებს', () => {
  it('ყოველი გამხელის შემდეგ შემდეგი ავტორი მოდის, ბოლოს — ისევ პირველი', () => {
    const players = names(3);
    const e = new TwoTruthsEngine(players);
    e.startGame();
    const authored: string[] = [];
    for (let i = 0; i < 4; i++) {
      authored.push(e.author.id);
      e.beginWriting();
      e.submit(['ა', 'ბ', 'გ'], 0);
      e.revealLie();
      e.next();
    }
    expect(authored).toEqual([players[0].id, players[1].id, players[2].id, players[0].id]);
    expect(e.phase).toBe('writeHandoff');
  });
});
