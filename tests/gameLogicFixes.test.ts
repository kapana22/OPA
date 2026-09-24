import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { __resetForTests } from '../src/core/storage';
import type { Player } from '../src/core/roster';
import { Sound } from '../src/core/sound';
import { MostLikelyEngine } from '../src/games/mostlikely/engine';
import { TenButEngine } from '../src/games/tenbut/engine';
import { StandardsEngine } from '../src/games/standards/engine';
import { TruthDareEngine } from '../src/games/truthdare/engine';
import { DareCardEngine } from '../src/games/darecard/engine';
import { RuleCardEngine, RULECARD_LAP_OPTIONS } from '../src/games/rulecard/engine';
import { PointOneEngine } from '../src/games/pointone/engine';
import { HerdEngine } from '../src/games/herd/engine';

/** თამაშის ლოგიკის შესწორებები — თვითხმა, ტყუილის ჯილდო, უთანასწორო ჯერები, ბარათის შეცვლა. */

let seq = 0;
const names = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: `g${seq++}`, name: `მოთამაშე ${i}`, score: 0 }));

beforeEach(() => __resetForTests());
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('MostLikely — ფარული ხმა', () => {
  it('საკუთარ თავს ხმას ვერ მისცემ', () => {
    const ps = names(3);
    const e = new MostLikelyEngine(ps);
    e.setMode('secret');
    e.startGame();
    e.beginVoting();
    e.castVote(ps[0]); // ps[0] აძლევს ხმას — თავის თავს
    expect(e.voterIndex).toBe(0);
    expect(e.totalVotes).toBe(0);
    e.castVote(ps[1]);
    expect(e.voterIndex).toBe(1);
  });

  it('ფრე — „ტელეფონის მაგნიტი“ ყველა გამარჯვებულს ეკუთვნის', () => {
    const ps = names(3);
    const e = new MostLikelyEngine(ps);
    e.totals = { [ps[0].id]: 2, [ps[2].id]: 2, [ps[1].id]: 1 };
    expect(e.leaders.map((p) => p.id).sort()).toEqual([ps[0].id, ps[2].id].sort());
    e.totals = {};
    expect(e.leaders).toEqual([]);
  });
});

describe('TenBut — სამიზნეს ტყუილისთვის ქულა არ ერიცხება', () => {
  it('ყველა აცდა — სამიზნე მაინც 0', () => {
    const e = new TenButEngine(names(3));
    e.startGame();
    e.beginRating();
    const target = e.target!;
    e.submit(0);
    e.submit(10);
    e.submit(10);
    expect(e.phase).toBe('result');
    expect(e.totalFor(target)).toBe(0);
    expect(e.surprisedCount).toBe(2);
  });

  it('ფაზის დაცვა: next/beginRating/swapFlaw', () => {
    const e = new TenButEngine(names(3));
    e.startGame();
    e.next(); // intro-ში next არაფერს აკეთებს
    expect(e.round).toBe(1);
    e.beginRating();
    const flaw = e.currentFlaw;
    e.swapFlaw();
    expect(e.currentFlaw).toBe(flaw);
    expect(e.phase).toBe('rating');
    e.beginRating(); // ხელახლა ვერ იწყება — შეფასება არ იშლება
    e.submit(4);
    e.beginRating();
    expect(e.targetScore).toBe(4);
  });
});

describe('Standards — უმცირესობის ქულა აღარ არის', () => {
  it('ქულა მხოლოდ მკითხავის პროგნოზს ერგება', () => {
    const ps = names(4);
    const e = new StandardsEngine(ps);
    e.startGame();
    e.beginVoting();
    e.cast('normal', 3); // მკითხავი — პროგნოზი 3, ორით აცდა
    e.cast('tooMuch');
    e.cast('tooMuch');
    e.cast('tooMuch');
    expect(e.phase).toBe('result');
    expect(Object.values(e.totals).reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('ფაზის დაცვა: next/beginVoting/swapExpectation', () => {
    const e = new StandardsEngine(names(3));
    e.startGame();
    e.next();
    expect(e.round).toBe(1);
    e.beginVoting();
    e.cast('normal', 1);
    const text = e.currentExpectation;
    e.swapExpectation();
    e.beginVoting();
    expect(e.currentExpectation).toBe(text);
    expect(e.voterIndex).toBe(1);
  });
});

describe('Truth or Dare — წრეები და ერთი შეცვლა', () => {
  it('ჯერები მოთამაშეთა რაოდენობის ჯერადია', () => {
    const e = new TruthDareEngine(names(3));
    e.setLaps(2);
    expect(e.totalTurns).toBe(6);
    e.setLaps(-1);
    expect(e.isEndless).toBe(true);
  });

  it('ბარათი ჯერზე მხოლოდ ერთხელ იცვლება', () => {
    const e = new TruthDareEngine(names(3));
    e.startGame();
    e.pick('dare');
    expect(e.canSwap).toBe(true);
    e.swap();
    const text = e.currentText;
    expect(e.canSwap).toBe(false);
    e.swap();
    expect(e.currentText).toBe(text);
    e.complete();
    e.pick('truth');
    expect(e.canSwap).toBe(true);
  });

  it('ყველა ერთნაირ ჯერს იღებს', () => {
    const ps = names(4);
    const e = new TruthDareEngine(ps);
    e.setLaps(2);
    e.startGame();
    const seen: Record<string, number> = {};
    while (e.phase !== 'summary') {
      const p = e.currentPlayer!;
      seen[p.id] = (seen[p.id] ?? 0) + 1;
      e.pick('truth');
      e.complete();
    }
    expect(Object.values(seen)).toEqual([2, 2, 2, 2]);
  });
});

describe('DareCard — წრეები, შეცვლა, დუელი, ფრე', () => {
  it('ბარათები წრეებით ითვლება', () => {
    const e = new DareCardEngine(names(3));
    e.setLaps(3);
    expect(e.totalCards).toBe(9);
    e.setLaps(0);
    expect(e.isEndless).toBe(true);
  });

  it('შეცვლა მხოლოდ თამაშში და ჯერზე ერთხელ', () => {
    const e = new DareCardEngine(names(3));
    e.swapCard(); // setup-ში არაფერი
    expect(e.swapped).toBe(false);
    e.startGame();
    e.swapCard();
    const card = e.currentCard;
    e.swapCard();
    expect(e.currentCard).toBe(card);
    expect(e.canSwap).toBe(false);
  });

  it('დუელის მეტოქე ყოველთვის სხვა მოთამაშეა და არა მხოლოდ მომდევნო', () => {
    const e = new DareCardEngine(names(4));
    const rivals = new Set<number>();
    const spy = vi.spyOn(Math, 'random');
    for (const r of [0, 0.4, 0.9]) {
      spy.mockReturnValue(r);
      e.holderIndex = 1;
      (e as unknown as { pickRival: () => void }).pickRival();
      expect(e.rivalIndex).not.toBe(1);
      rivals.add(e.rivalIndex);
    }
    expect(rivals.size).toBe(3);
  });

  it('ფრე — ყველა ჩემპიონი ჩანს', () => {
    const ps = names(3);
    const e = new DareCardEngine(ps);
    e.done = { [ps[0].id]: 2, [ps[1].id]: 2, [ps[2].id]: 1 };
    expect(e.champions.map((p) => p.id).sort()).toEqual([ps[0].id, ps[1].id].sort());
  });
});

describe('RuleCard — წრეები, დარღვევა ნებისმიერ ბარათზე, კანონმდებლები', () => {
  it('ნაგულისხმევი წრე ღილაკებს შორისაა', () => {
    const e = new RuleCardEngine(names(3));
    expect(RULECARD_LAP_OPTIONS).toContain(e.settings.laps);
    e.setLaps(2);
    expect(e.totalCards).toBe(6);
  });

  it('წესის დარღვევა ჯარიმას წერს და ბარათს არ ცვლის', () => {
    const ps = names(3);
    const e = new RuleCardEngine(ps);
    e.startGame();
    e.recordBreak([ps[1]]); // მოქმედი წესი ჯერ არ არის
    expect(e.forfeitCount(ps[1])).toBe(0);
    e.activeRules = [{ id: 'r', card: { text: 'x', kind: 'rule', short: null }, broughtBy: ps[0].name, atCard: 1 }];
    const drawn = e.drawn;
    const card = e.currentCard;
    e.recordBreak([ps[1], ps[2]]);
    expect(e.forfeitCount(ps[1])).toBe(1);
    expect(e.forfeitCount(ps[2])).toBe(1);
    expect(e.drawn).toBe(drawn);
    expect(e.currentCard).toBe(card);
  });

  it('შეცვლა ჯერზე ერთხელ', () => {
    const e = new RuleCardEngine(names(3));
    e.startGame();
    e.swapCard();
    const card = e.currentCard;
    e.swapCard();
    expect(e.currentCard).toBe(card);
  });

  it('ფრე — ყველა კანონმდებელი ჩანს', () => {
    const ps = names(3);
    const e = new RuleCardEngine(ps);
    e.brought = { [ps[2].id]: 2, [ps[0].id]: 2 };
    expect(e.lawmakers.map((p) => p.id).sort()).toEqual([ps[0].id, ps[2].id].sort());
  });
});

describe('PointOne — ათვლის ბოლოს ხმაც ისმის', () => {
  it("countdown → tally უკრავს 'start'-ს", () => {
    vi.useFakeTimers();
    const play = vi.spyOn(Sound, 'play');
    const e = new PointOneEngine(names(3));
    e.startGame();
    e.begin();
    expect(e.stage).toBe('countdown');
    vi.advanceTimersByTime(3000);
    expect(e.stage).toBe('tally');
    expect(play).toHaveBeenCalledWith('start');
  });
});

describe('Herd — ფონზე გადასვლისას ტექსტი არ იკარგება', () => {
  it('იმავე მოთამაშეს დრაფტი უბრუნდება, შემდეგისთვის იწმინდება', () => {
    const e = new HerdEngine(names(4));
    e.startGame();
    e.beginVoting();
    e.beginWriting();
    e.setDraft('პიცა');
    e.hideAnswer();
    expect(e.phase).toBe('pass');
    e.beginWriting();
    expect(e.draft).toBe('პიცა');
    e.submit('პიცა');
    expect(e.draft).toBe('');
  });
});
