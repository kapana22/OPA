import { describe, it, expect, beforeEach } from 'vitest';
import { __resetForTests } from '../src/core/storage';
import { StandardsBank, DareCardBank } from '../src/content/banks';
import type { Player } from '../src/core/roster';
import { StandardsEngine } from '../src/games/standards/engine';
import { HerdEngine } from '../src/games/herd/engine';
import { TenButEngine } from '../src/games/tenbut/engine';
import { WavelengthEngine } from '../src/games/wavelength/engine';
import { PointOneEngine } from '../src/games/pointone/engine';
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
describe('TenBut — ქულა სიზუსტისა და გაკვირვებისთვის', () => {
  it('ქულები საფეხურებად ნაწილდება და სამიზნეს გაკვირვება ერგება', () => {
    const players = names(5);
    const e = new TenButEngine(players);
    e.setLaps(1);
    e.startGame();
    expect(e.currentHolder?.id).toBe(e.target?.id);

    e.beginRating();
    e.submit(8); // სამიზნემ 8 დაწერა
    const guessers = e.guessers;
    expect(guessers.some((g) => g.id === e.target?.id)).toBe(false);

    e.submit(8); // ზუსტი  → +3
    e.submit(7); // ერთით  → +2
    e.submit(6); // ორით   → +1
    e.submit(2); // ექვსით → 0, სამიზნეს +1

    expect(e.roundPoint(guessers[0])).toBe(3);
    expect(e.roundPoint(guessers[1])).toBe(2);
    expect(e.roundPoint(guessers[2])).toBe(1);
    expect(e.roundPoint(guessers[3])).toBe(0);
    expect(e.roundPoint(e.target!)).toBe(1);
  });

  it('სამიზნე შემდეგ რაუნდში იცვლება', () => {
    const e = new TenButEngine(names(5));
    e.setLaps(1);
    e.startGame();
    e.beginRating();
    e.submit(5);
    for (let i = 0; i < 4; i++) e.submit(5);
    const first = e.target!;
    e.next();
    expect(e.target?.id).not.toBe(first.id);
  });

  it('წრეები რაუნდებად და ზღვრები', () => {
    const t = new TenButEngine(names(5));
    t.setLaps(2);
    t.startGame();
    expect(t.totalRounds).toBe(10);
    t.setLaps(0);
    expect(t.settings.laps).toBe(1);
    t.setLaps(99);
    expect(t.settings.laps).toBe(3);
  });

  it('შეფასების ზღვრები იკვეცება', () => {
    const t = new TenButEngine(names(4));
    t.startGame();
    t.beginRating();
    t.submit(99);
    expect(t.targetScore).toBe(10);
    t.submit(-5);
    expect(t.guessFor(t.guessers[0])).toBe(0);
  });

  it.each([3, 4])('%i კაცზე რაუნდს ასრულებს და ქულა ირიცხება', (count) => {
    const players = names(count);
    const t = new TenButEngine(players);
    t.setLaps(1);
    t.startGame();
    t.beginRating();
    t.submit(7);
    for (let i = 0; i < count - 1; i++) t.submit(7);
    expect(t.phase).toBe('result');
    const totals = players.map((p) => t.totalFor(p));
    expect(totals.every((v) => v >= 0)).toBe(true);
    expect(totals.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
  });
});

// ═══ „ნორმაა თუ არა?“
describe('Standards — პროგნოზი მკითხავს, ქულა უმცირესობასაც', () => {
  it('ზუსტ პროგნოზზე +3, უმცირესობაზე +1', () => {
    const players = names(5);
    const e = new StandardsEngine(players);
    e.setLaps(1);
    e.startGame();
    const reader = e.reader!;
    expect(e.currentVoter?.id).toBe(reader.id);
    expect(e.currentVoterIsReader).toBe(true);

    e.beginVoting();
    e.cast('normal', 2); // მკითხავი: „ნორმაა“, პროგნოზი 2
    expect(e.currentVoterIsReader).toBe(false);
    e.cast('normal');
    e.cast('tooMuch');
    e.cast('tooMuch');
    e.cast('tooMuch');

    expect(e.normalVotes).toBe(2);
    expect(e.minoritySide).toBe('normal');
    expect(players.filter((p) => e.isInMinority(p))).toHaveLength(2);
    // ზუსტი პროგნოზი 3 + უმცირესობა 1 = 4
    expect(e.roundPoint(reader)).toBe(4);
  });

  it('ერთსულოვნებაზე უმცირესობის ქულა არავის ერგება', () => {
    const players = names(5);
    const e = new StandardsEngine(players);
    e.setLaps(1);
    e.startGame();
    e.beginVoting();
    for (let i = 0; i < 5; i++) e.currentVoterIsReader ? e.cast('normal', 5) : e.cast('normal');
    expect(e.minoritySide).toBeNull();
    expect(players.filter((p) => e.roundPoint(p) > 0)).toHaveLength(1);
  });

  it.each([3, 4])('%i კაცზე უმცირესობა ერთია', (count) => {
    const st = new StandardsEngine(names(count));
    st.setLaps(1);
    st.startGame();
    st.beginVoting();
    st.cast('normal', 1);
    for (let i = 0; i < count - 1; i++) st.cast('tooMuch');
    expect(st.phase).toBe('result');
    expect(st.minoritySide).toBe('normal');
  });
});

// ═══ „როგორც ყველა“
describe('Herd — შებრუნება შემთხვევითია, შავი ცხვარი ითვლება', () => {
  it('ჩვეულებრივში უმრავლესობა იგებს, შებრუნებულში უმცირესობა', () => {
    const players = names(6);
    const e = new HerdEngine(players);
    e.setTwists(true);
    e.setRounds(8);
    e.startGame();
    expect(e.isReversed).toBe(false); // პირველი რაუნდი არასდროსაა შებრუნებული

    let seenTwist = false;
    let seenPlain = false;
    for (let r = 0; r < 8; r++) {
      const reversed = e.isReversed;
      if (reversed) seenTwist = true;
      else seenPlain = true;
      e.beginVoting();
      for (let i = 0; i < 6; i++) e.castVote(i < 4 ? 'a' : 'b'); // ოთხი A, ორი B
      if (reversed) {
        expect(e.winningSide).toBe('b');
        expect(e.roundWinners).toHaveLength(2);
      } else {
        expect(e.winningSide).toBe('a');
        expect(e.roundWinners).toHaveLength(4);
      }
      e.next();
    }
    expect(seenTwist && seenPlain).toBe(true);
    expect(new Set(e.oddOneOut.map((p) => p.name))).toEqual(new Set(['დათო', 'ანა']));
  });

  it('შებრუნების გამორთვისას აღარ ხდება', () => {
    const e = new HerdEngine(names(6));
    e.setTwists(false);
    e.setRounds(8);
    e.startGame();
    let anyTwist = false;
    for (let r = 0; r < 8; r++) {
      if (e.isReversed) anyTwist = true;
      e.beginVoting();
      for (let i = 0; i < 6; i++) e.castVote('a');
      e.next();
    }
    expect(anyTwist).toBe(false);
  });

  it('სამრაუნდიან პარტიაზე შებრუნება არ ჩაჯდება და არ ტყდება', () => {
    const h = new HerdEngine(names(4));
    h.setTwists(true);
    h.setRounds(3);
    h.startGame();
    expect(h.isReversed).toBe(false);
  });
});

// ═══ „ერთ ტალღაზე“
describe('Wavelength — საერთო ქულა, ყველას თანაბარი ჯილდო', () => {
  it('ზუსტი მოხვედრები ბრწყინვალე შედეგს იძლევა', () => {
    const e = new WavelengthEngine(names(4));
    e.setLaps(1);
    e.startGame();
    expect(e.goal).toBe(8);
    expect(e.maxScore).toBe(16);

    let total = 0;
    for (let i = 0; i < 4; i++) {
      e.beginGuess();
      e.setGuess(e.target); // ზუსტი მოხვედრა
      e.lockGuess();
      total += e.lastPoints;
      e.next();
    }
    expect(e.tableScore).toBe(total);
    expect(total).toBe(16);
    expect(e.verdict).toBe('brilliant');
    expect(e.rosterReward).toBe(3);
  });

  it('სუსტ შედეგზეც ყველა თანაბრად +1', () => {
    const weak = new WavelengthEngine(names(4));
    weak.setLaps(1);
    weak.startGame();
    for (let i = 0; i < 4; i++) {
      weak.beginGuess();
      weak.setGuess(weak.target > 0.5 ? 0 : 1);
      weak.lockGuess();
      weak.next();
    }
    expect(weak.verdict).toBe('missed');
    expect(weak.rosterReward).toBe(1);
  });
});

// ═══ „მიუთითე ერთზე“
describe('PointOne — ერთი მრიცხველი, არა ორი', () => {
  it('ვარსკვლავები და არდასახელებულები ცალკე ითვლება', () => {
    const players = names(5);
    const e = new PointOneEngine(players);
    e.setRounds(3);
    e.startGame();
    for (let r = 0; r < 3; r++) {
      e.begin();
      e.toggle(players[0]);
      e.toggle(players[1]);
      e.next();
    }
    expect(new Set(e.starsOfTheNight.map((p) => p.id))).toEqual(new Set([players[0].id, players[1].id]));
    expect(e.totalFor(players[0])).toBe(3);
    expect(e.totalFor(players[1])).toBe(3);
    expect(new Set(e.neverNamed.map((p) => p.name))).toEqual(new Set(['ლაშა', 'მარი', 'დათო']));
  });
});

// ═══ დასტის მეხსიერება ძრავებს შორის
describe('დასტა — მეხსიერება პარტიებს შორის', () => {
  it('18 რაუნდი სამ პარტიაზე — გამეორება არ არის', () => {
    const players = names(4);
    const seen: string[] = [];
    for (let party = 0; party < 3; party++) {
      const e = new TenButEngine(players);
      e.setLaps(2);
      e.startGame();
      for (let i = 0; i < 6; i++) {
        seen.push(e.currentFlaw);
        e.next();
      }
    }
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('კატეგორიის შეცვლა პარტიებს შორის მეხსიერებას არ ურევს', () => {
    const players = names(4);
    const run = (categoryID: string) => {
      const e = new StandardsEngine(players);
      e.setCategory(categoryID);
      e.setLaps(1);
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
describe('Never — სიცოცხლეები', () => {
  it('მონიშვნა სიცოცხლეს აკლებს და გადაბრუნება აბრუნებს', () => {
    const players = names(4);
    const e = new NeverEngine(players);
    e.setLives(3);
    e.startGame();
    expect(e.livesLeft(players[0])).toBe(3);

    e.toggle(players[0]);
    expect(e.livesLeft(players[0])).toBe(2);
    expect(e.isMarked(players[0])).toBe(true);

    e.toggle(players[0]); // გადავიფიქრეთ
    expect(e.livesLeft(players[0])).toBe(3);
    expect(e.isMarked(players[0])).toBe(false);
  });

  it('სიცოცხლის ამოწურვისას ამოვარდნის რიგი ინახება', () => {
    const players = names(4);
    const e = new NeverEngine(players);
    e.setLives(1);
    e.startGame();
    e.toggle(players[2]);
    expect(e.isOut(players[2])).toBe(true);
    expect(e.outOrder).toEqual([players[2].id]);
    expect(e.eliminatedThisRound.map((p) => p.id)).toEqual([players[2].id]);
  });
});

describe('MostLikely — სწრაფი და ფარული რეჟიმი', () => {
  it('სწრაფ რეჟიმში ერთი შეხება რაუნდს ასრულებს', () => {
    const players = names(4);
    const e = new MostLikelyEngine(players);
    e.setMode('quick');
    e.setRounds(3);
    e.startGame();
    expect(e.phase).toBe('prompt');
    e.beginVoting();
    e.pick(players[1]);
    expect(e.phase).toBe('result');
    expect(e.totalFor(players[1])).toBe(1);
  });

  it('ფარულ რეჟიმში ყველა იძლევა ხმას და ფრეც შესაძლებელია', () => {
    const players = names(4);
    const e = new MostLikelyEngine(players);
    e.setMode('secret');
    e.setRounds(3);
    e.startGame();
    e.beginVoting();
    e.castVote(players[0]);
    e.castVote(players[0]);
    e.castVote(players[1]);
    e.castVote(players[1]);
    expect(e.phase).toBe('result');
    // ორ-ორი ხმა — ორივე გამარჯვებულია
    expect(new Set(e.roundWinners)).toEqual(new Set([players[0].id, players[1].id]));
    expect(e.totalFor(players[0])).toBe(1);
    expect(e.totalFor(players[1])).toBe(1);
  });
});

// ═══ „გააკეთე ან...“
describe('DareCard — ბარათების დასტა', () => {
  it('მთელი პარტია გადის, ბარათი არ მეორდება და ჯერი წრეზე ტრიალებს', () => {
    const players = names(5);
    const e = new DareCardEngine(players);
    e.setHeat('party');
    e.setForfeit('tableChoice');
    e.setCards(12);
    e.startGame();

    expect(e.phase).toBe('card');
    expect(e.currentCard.text).not.toBe('—');

    const seen: string[] = [];
    const kinds = new Set<string>();
    let duels = 0;

    while (e.phase === 'card') {
      seen.push(e.currentCard.text);
      kinds.add(e.currentCard.kind);
      if (e.currentCard.kind === 'duel') {
        expect(e.rival).not.toBeNull();
        expect(e.rival?.id).not.toBe(e.holder?.id);
        expect(e.needsDuelWinner).toBe(true);
        duels += 1;
        e.resolveDuel(e.holder!);
      } else if (seen.length % 3 === 0) {
        e.markForfeit();
      } else {
        e.markDone();
      }
    }

    expect(seen).toHaveLength(12);
    expect(new Set(seen).size).toBe(seen.length);
    expect(e.phase).toBe('summary');
    // Swift-ის ორიგინალი აქ 12-ბარათიან ნიმუშში ითვლიდა ტიპებს — ეს ალბათურია
    // (გაზომილი: 0.55% ჩავარდნა თითო გაშვებაზე) და ტესტს არამდგრადს ხდიდა.
    // განზრახვა იგივეა — დასტა მრავალფეროვანი უნდა იყოს — მაგრამ ეს დასტაზე
    // მოწმდება და არა ერთ შემთხვევით ნიმუშზე.
    expect(kinds.size).toBeGreaterThanOrEqual(2);

    const totalDone = players.reduce((n, p) => n + e.doneCount(p), 0);
    const totalForfeit = players.reduce((n, p) => n + e.forfeitCount(p), 0);
    // დუელი ორ ჩანაწერს ტოვებს — გამარჯვებულს და წაგებულს.
    expect(totalDone + totalForfeit).toBe(12 + duels);

    const holders = players.filter((p) => e.doneCount(p) + e.forfeitCount(p) > 0);
    expect(holders.length).toBeGreaterThanOrEqual(4);
  });

  it('დასტა ოთხივე ტიპს შეიცავს — მრავალფეროვნება დასტაშია, არა ნიმუშში', () => {
    const kinds = new Set(DareCardBank.cards('party').map((c) => c.kind));
    expect(kinds).toEqual(new Set(['solo', 'group', 'target', 'duel']));
  });

  it('ჩემპიონი ყველაზე მეტს ასრულებს', () => {
    const players = names(4);
    const e = new DareCardEngine(players);
    e.setCards(8);
    e.startGame();
    while (e.phase === 'card') {
      if (e.currentCard.kind === 'duel') e.resolveDuel(e.holder!);
      else e.markDone();
    }
    const best = Math.max(...players.map((p) => e.doneCount(p)));
    expect(e.champion === null || e.doneCount(e.champion) === best).toBe(true);
  });
});

// ═══ „მაგიდის წესები“
describe('RuleCard — წესები გროვდება, შვება სარქველია', () => {
  it('მიღებული წესი მოქმედ სიაში რჩება', () => {
    const players = names(4);
    const e = new RuleCardEngine(players);
    e.setCards(30);
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
    e.setCards(60);
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
    e.setCards(60);
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
