import { describe, it, expect, beforeEach } from 'vitest';
import { __resetForTests, setJSON } from '../src/core/storage';
import { CharadesBank } from '../src/content/banks';
import type { Player } from '../src/core/roster';
import { ImpostorEngine } from '../src/games/impostor/engine';
import { SpyEngine } from '../src/games/spy/engine';
import { MafiaEngine } from '../src/games/mafia/engine';
import { MostLikelyEngine } from '../src/games/mostlikely/engine';
import { TwoTruthsEngine } from '../src/games/twotruths/engine';
import { WavelengthEngine } from '../src/games/wavelength/engine';
import { WordRushEngine } from '../src/games/wordrush/engine';
import { RuleCardEngine } from '../src/games/rulecard/engine';
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

describe('Undercover — გამარჯვება გადარჩენილებს ერგება', () => {
  it('ამოვარდნილი ჯაშუში ქულას არ იღებს, ცოცხალი Mr White კი — კი', () => {
    const [u, w, c1, c2, c3] = names(5);
    const e = new SpyEngine([u, w, c1, c2, c3]);
    e.roles = { [u.id]: 'undercover', [w.id]: 'mrWhite', [c1.id]: 'civilian', [c2.id]: 'civilian', [c3.id]: 'civilian' };
    e.eliminated = new Set([u.id, c1.id, c2.id]); // დარჩა: Mr White და ერთი მოქალაქე
    (e as unknown as { evaluate(): void }).evaluate();
    expect(e.winner).toBe('undercovers');
    expect(e.finalPoints[w.id]).toBe(3);
    expect(e.finalPoints[u.id]).toBeUndefined();
    expect(e.finalPoints[c3.id]).toBeUndefined();
  });
});

describe('Mafia — გადამწყვეტი შედეგის ეკრანი არ იკარგება', () => {
  it('მაფიის გაძევება ჯერ დღის შედეგს აჩვენებს, დასასრული მერე მოდის', () => {
    const [m, a, b, c] = names(4);
    const e = new MafiaEngine([m, a, b, c]);
    e.startGame();
    e.roles = { [m.id]: 'mafia', [a.id]: 'civilian', [b.id]: 'civilian', [c.id]: 'civilian' };
    e.voteOut(m);
    expect(e.phase).toBe('dayResult');
    expect(e.votedOut?.id).toBe(m.id);
    expect(e.winner).toBe('city');
    e.continueGame();
    expect(e.phase).toBe('gameOver');
  });
});

describe('Impostor / Undercover — „∞“ განხილვა ინახება', () => {
  it('0 წამი ინახება და ხელახლა ჩატვირთვისასაც 0-ია', () => {
    const e = new ImpostorEngine(names(4));
    e.setDiscussionSeconds(0);
    expect(e.settings.discussionSeconds).toBe(0);
    expect(new ImpostorEngine(names(4)).settings.discussionSeconds).toBe(0);
    const s = new SpyEngine(names(4));
    s.setDiscussionSeconds(0);
    expect(new SpyEngine(names(4)).settings.discussionSeconds).toBe(0);
    // ზღვრები კი ისევ მოქმედებს
    s.setDiscussionSeconds(5);
    expect(s.settings.discussionSeconds).toBe(30);
  });
});

describe('Most Likely To — შენახული პარამეტრები სუფთავდება', () => {
  it('rounds: 0 და გაუქმებული კატეგორია ნაგულისხმევზე ბრუნდება', () => {
    setJSON('splash.mostlikely.settings.v1', { mode: 'weird', rounds: 0, categoryID: 'no-such-category' });
    const e = new MostLikelyEngine(names(3));
    expect(e.settings.rounds).toBe(3); // ზღვარზე იჭრება, როგორც `setRounds`-ში
    expect(e.settings.categoryID).toBeNull();
    expect(e.settings.mode).toBe('quick');
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

describe('Wavelength — ქულა ნაჩვენებ მანძილზე ითვლება', () => {
  it('ეკრანზე „28“ ზუსტად 28-ის ზოლში ვარდება, არა უფრო ვიწროში', () => {
    const e = new WavelengthEngine(names(3));
    e.startGame();
    e.target = 0.5;
    e.setGuess(0.5 + 0.28 + 1e-9); // მრგვალდება 78-ზე → მანძილი 28
    e.lockGuess();
    expect(e.lastPoints).toBe(e.pointsForDistance(0.28));
    expect(e.pointsForDistance(0.28 + 1e-9)).not.toBe(e.lastPoints);
  });
});

describe('სიტყვის რბოლა — ფიქსირებული კატეგორია არ იცვლება', () => {
  it('swapCategory() არაფერს აკეთებს და დასტიდან სიტყვას არ ხარჯავს', () => {
    const e = new WordRushEngine(names(3));
    e.setCategory(CharadesBank.categories[0].id);
    e.startGame();
    const starter = e.starter;
    expect(e.canSwapCategory).toBe(false);
    e.swapCategory();
    expect(e.starter).toBe(starter);
    e.setCategory(null);
    expect(e.canSwapCategory).toBe(true);
  });
});

describe('House Rules — ჯარიმა დადასტურებისას ერთხელ ირიცხება', () => {
  it('finishForfeits() თითოეულ დამრღვევს ერთს უმატებს', () => {
    const [a, b, c] = names(3);
    const e = new RuleCardEngine([a, b, c]);
    e.startGame();
    e.finishForfeits([a, b]);
    expect([e.forfeitCount(a), e.forfeitCount(b), e.forfeitCount(c)]).toEqual([1, 1, 0]);
    e.finishForfeits([a]);
    expect(e.forfeitCount(a)).toBe(2);
    expect(e.mostForfeits.map((p) => p.id)).toEqual([a.id]);
  });
});

describe('Most Likely To — „რადარის ქვემოთ“', () => {
  it('ვისაც არავინ დაასახელა, ჯილდოში ხვდება; სულ ნულებზე — არავინ', () => {
    const [a, b, c] = names(3);
    const e = new MostLikelyEngine([a, b, c]);
    expect(e.neverNamed).toEqual([]);            // ჯერ არავის უთამაშია
    e.totals = { [a.id]: 3, [b.id]: 1 };
    expect(e.neverNamed.map((p) => p.id)).toEqual([c.id]);
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
