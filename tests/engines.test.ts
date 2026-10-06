import { describe, it, expect, beforeEach } from 'vitest';
import { __resetForTests } from '../src/core/storage';
import { StandardsBank, DareCardBank, PointOneBank, PromptBank } from '../src/content/banks';
import type { Player } from '../src/core/roster';
import { StandardsEngine } from '../src/games/standards/engine';
import { TenButEngine } from '../src/games/tenbut/engine';
import { NeverEngine } from '../src/games/never/engine';
import { MostLikelyEngine } from '../src/games/mostlikely/engine';
import { DareCardEngine } from '../src/games/darecard/engine';
import { RuleCardEngine } from '../src/games/rulecard/engine';

/**
 * პორტი: `Tools/tests/engines/main.swift`.
 *
 * ესენი ქულების წესების ცოცხალი შემოწმებებია — თითოეული რეალურ ხარვეზს
 * შეესაბამება, რომელიც პარტიაზე გამოჩნდა.
 */

const NAMES = ['გიო', 'ნინო', 'ლაშა', 'მარი', 'დათო', 'ანა'];
let seq = 0;
const names = (n: number): Player[] =>
  NAMES.slice(0, n).map((name) => ({ id: `p${seq++}`, name, score: 0 }));

beforeEach(() => __resetForTests());

// ═══ „10-ია, მაგრამ...“
// ═══ „ნორმაა თუ არა?“

// ═══ დასტის მეხსიერება ძრავებს შორის
describe('TenBut — ბარათი და „შემდეგი“', () => {
  it('სამიზნე წრეზე იცვლება, ლიმიტი არ არის; „სხვა ჩვევა“ რაუნდს არ ხარჯავს', () => {
    const players = names(3);
    const e = new TenButEngine(players);
    e.startGame();
    expect(e.phase).toBe('card');
    expect(e.target?.id).toBe(players[0].id);
    e.swapFlaw();
    expect(e.round).toBe(1);
    e.next();
    expect(e.target?.id).toBe(players[1].id);
    e.next();
    e.next();
    expect(e.target?.id).toBe(players[0].id); // წრე თავიდან
    expect(e.phase).toBe('card');
    e.finish();
    expect(e.phase).toBe('summary');
    e.next();
    expect(e.round).toBe(4);
  });
});

describe('დასტა — მეხსიერება პარტიებს შორის', () => {
  it('18 რაუნდი სამ პარტიაზე — გამეორება არ არის', () => {
    const players = names(4);
    const seen: string[] = [];
    for (let party = 0; party < 3; party++) {
      const e = new TenButEngine(players);
      e.startGame();
      for (let i = 0; i < 6; i++) {
        seen.push(e.currentFlaw);
        e.next();
      }
    }
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('კატეგორიის შეცვლა პარტიებს შორის მეხსიერებას არ ურევს', () => {
    const run = (categoryID: string) => {
      const e = new StandardsEngine();
      e.setCategories([categoryID]);
      e.startGame();
      return Array.from({ length: 4 }, () => {
        const x = e.currentExpectation;
        e.next();
        return x;
      });
    };

    const first = new Set(run(StandardsBank.categories[0].id));
    const second = new Set(run(StandardsBank.categories[1].id));
    expect([...first].some((x) => second.has(x))).toBe(false);

    // პირველ კატეგორიაზე დაბრუნებისას იქიდან აგრძელებს
    const again = run(StandardsBank.categories[0].id);
    expect(again.some((x) => first.has(x))).toBe(false);
  });
});

// ═══ დანარჩენი ძრავები — ძირითადი ნაკადი
describe('Never — რაუნდები', () => {
  it('ლიმიტი არ არის — მაგიდა თვითონ ასრულებს; თითების რაოდენობა 1–10-ში რჩება', () => {
    const e = new NeverEngine(names(4));
    e.setLives(99);
    expect(e.settings.startingLives).toBe(10);
    e.startGame();
    for (let i = 0; i < 50; i++) e.next();
    expect(e.phase).toBe('round');
    e.finish();
    expect(e.phase).toBe('summary');
  });
});

describe('MostLikely — კითხვა და „შემდეგი“, ქულების გარეშე', () => {
  it('ლიმიტი არ არის, „სხვა“ რაუნდს არ ხარჯავს, „დასრულება“ ასრულებს', () => {
    const e = new MostLikelyEngine(names(4));
    e.startGame();
    expect(e.phase).toBe('prompt');
    e.skipPrompt();
    expect(e.round).toBe(1);
    for (let i = 0; i < 40; i++) e.next();
    expect(e.phase).toBe('prompt');
    e.finish();
    expect(e.phase).toBe('summary');
    e.next();
    expect(e.round).toBe(41);
  });

  it('Point at One-ის კითხვები Most Likely To-შია', () => {
    const extra = PointOneBank.categories.flatMap((c) => c.items);
    const all = new Set(PromptBank.all);
    expect(extra.every((t) => all.has(t))).toBe(true);
    expect(PromptBank.category('trust')).toBeDefined();
  });
});

// ═══ „გააკეთე ან...“
describe('DareCard — ბარათების დასტა', () => {
  it('მთელი პარტია გადის, ბარათი არ მეორდება და ჯერი წრეზე ტრიალებს', () => {
    const players = names(4);
    const e = new DareCardEngine(players);
    e.setHeat('party');
    e.setLaps(3); // 4 × 3 = 12
    e.startGame();

    expect(e.phase).toBe('card');
    expect(e.currentCard.text).not.toBe('—');

    const seen: string[] = [];
    const kinds = new Set<string>();
    const holders = new Set<string>();

    while (e.phase === 'card') {
      seen.push(e.currentCard.text);
      kinds.add(e.currentCard.kind);
      holders.add(e.holder!.id);
      if (e.currentCard.kind === 'duel') {
        expect(e.rival).not.toBeNull();
        expect(e.rival?.id).not.toBe(e.holder?.id);
      }
      e.next();
    }

    expect(seen).toHaveLength(12);
    expect(new Set(seen).size).toBe(seen.length);
    expect(e.phase).toBe('summary');
    // Swift-ის ორიგინალი აქ 12-ბარათიან ნიმუშში ითვლიდა ტიპებს — ეს ალბათურია
    // (გაზომილი: 0.55% ჩავარდნა თითო გაშვებაზე) და ტესტს არამდგრადს ხდიდა.
    // განზრახვა იგივეა — დასტა მრავალფეროვანი უნდა იყოს — მაგრამ ეს დასტაზე
    // მოწმდება და არა ერთ შემთხვევით ნიმუშზე.
    expect(kinds.size).toBeGreaterThanOrEqual(2);

    expect(holders.size).toBeGreaterThanOrEqual(4);
  });

  it('დასტა ოთხივე ტიპს შეიცავს — მრავალფეროვნება დასტაშია, არა ნიმუშში', () => {
    const kinds = new Set(DareCardBank.cards('party').map((c) => c.kind));
    expect(kinds).toEqual(new Set(['solo', 'group', 'target', 'duel']));
  });

});

// ═══ „მაგიდის წესები“
describe('RuleCard — წესები გროვდება, შვება სარქველია', () => {
  it('მიღებული წესი მოქმედ სიაში რჩება', () => {
    const players = names(4);
    const e = new RuleCardEngine(players);
    e.setLaps(0);
    e.setRuleLimit(6);
    e.startGame();

    let accepted = 0;
    while (e.phase === 'card' && accepted < 3) {
      if (e.currentCard.kind === 'rule') {
        const holder = e.holder!;
        e.acceptRule();
        accepted += 1;
        expect(e.activeRules[accepted - 1].broughtBy).toBe(holder.name);
      } else {
        e.markDone();
      }
    }
    expect(e.activeRules).toHaveLength(3);
    expect(accepted).toBe(3);
  });

  it('ჭერზე მისვლისას მხოლოდ შვება მოდის', () => {
    const e = new RuleCardEngine(names(4));
    e.setLaps(0);
    e.setRuleLimit(3);
    e.startGame();

    while (e.phase === 'card' && e.activeRules.length < 3) {
      if (e.currentCard.kind === 'rule') e.acceptRule();
      else e.markDone();
    }
    expect(e.activeRules).toHaveLength(3);
    expect(e.rulesAreFull).toBe(true);
    // სარქველი გაიხსნა — შემდეგი ბარათი შვებაა
    expect(e.currentCard.kind).toBe('relief');
  });

  it('შვება წესს შლის', () => {
    const e = new RuleCardEngine(names(4));
    e.setLaps(0);
    e.setRuleLimit(3);
    e.startGame();
    while (e.phase === 'card' && e.activeRules.length < 3) {
      if (e.currentCard.kind === 'rule') e.acceptRule();
      else e.markDone();
    }
    const first = e.activeRules[0];
    e.removeRule(first);
    expect(e.activeRules).toHaveLength(2);
    expect(e.activeRules.some((r) => r.id === first.id)).toBe(false);
    expect(e.rulesAreFull).toBe(false);
  });
});
