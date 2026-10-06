import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { __resetForTests } from '../src/core/storage';
import { DareCardBank } from '../src/content/banks';
import type { Player } from '../src/core/roster';
import { TruthDareEngine } from '../src/games/truthdare/engine';
import { DareCardEngine } from '../src/games/darecard/engine';
import { RuleCardEngine, RULECARD_LAP_OPTIONS } from '../src/games/rulecard/engine';

/** თამაშის ლოგიკის შესწორებები — თვითხმა, ტყუილის ჯილდო, უთანასწორო ჯერები, ბარათის შეცვლა. */

let seq = 0;
const names = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({ id: `g${seq++}`, name: `მოთამაშე ${i}`, score: 0 }));

beforeEach(() => __resetForTests());
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('Truth or Dare — წრეები და ერთი შეცვლა', () => {
  it.each([0, 1])('%i მოთამაშით ვერ იწყება და ფარული დავალება არ იხსნება', (count) => {
    const e = new TruthDareEngine(names(count));
    e.startGame();
    e.pick('dare');
    expect(e.phase).toBe('setup');
    expect(e.currentText).toBe('');
  });
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
    e.next();
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
      e.next();
    }
    expect(Object.values(seen)).toEqual([2, 2, 2, 2]);
  });
});

describe('Truth or Dare — უარზე ჯარიმა', () => {
  it('„უარი“ ერთხელ აჩვენებს ჯარიმას Do or Pay-ის „შენ“ ბარათებიდან, „შემდეგი“ ჯერს გადასცემს', () => {
    const e = new TruthDareEngine(names(3));
    e.startGame();
    e.pick('dare');
    expect(e.penalty).toBeNull();
    e.refuse();
    const penalty = e.penalty;
    expect(penalty).not.toBeNull();
    expect(DareCardBank.card(penalty!)?.kind).toBe('solo');
    e.refuse();
    expect(e.penalty).toBe(penalty);
    const text = e.currentText;
    e.swap(); // ჯარიმის შემდეგ ბარათი აღარ იცვლება
    expect(e.currentText).toBe(text);
    e.next();
    expect(e.penalty).toBeNull();
    expect(e.phase).toBe('turn');
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

});

describe('RuleCard — წრეები და ბარათის შეცვლა', () => {
  it('ნაგულისხმევი წრე ღილაკებს შორისაა', () => {
    const e = new RuleCardEngine(names(3));
    expect(RULECARD_LAP_OPTIONS).toContain(e.settings.laps);
    e.setLaps(2);
    expect(e.totalCards).toBe(6);
  });

  it('შეცვლა ჯერზე ერთხელ', () => {
    const e = new RuleCardEngine(names(3));
    e.startGame();
    e.swapCard();
    const card = e.currentCard;
    e.swapCard();
    expect(e.currentCard).toBe(card);
  });

});
