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
import { RuleCardEngine } from '../src/games/rulecard/engine';
import { BombEngine } from '../src/games/bomb/engine';
import { WhoWroteEngine } from '../src/games/whowrote/engine';
import { PairBank } from '../src/content/banks';

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
  it('ამოვარდნილი ჯაშუშიც იღებს, როგორც ამოვარდნილი მოქალაქე', () => {
    const [u, w, c1, c2, c3] = names(5);
    const e = new SpyEngine([u, w, c1, c2, c3]);
    e.roles = { [u.id]: 'undercover', [w.id]: 'mrWhite', [c1.id]: 'civilian', [c2.id]: 'civilian', [c3.id]: 'civilian' };
    e.eliminated = new Set([u.id, c1.id, c2.id]); // დარჩა: Mr White და ერთი მოქალაქე
    (e as unknown as { evaluate(): void }).evaluate();
    expect(e.winner).toBe('undercovers');
    expect(e.finalPoints[w.id]).toBe(3);
    expect(e.finalPoints[u.id]).toBe(3);
    expect(e.finalPoints[c3.id]).toBeUndefined();
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

  it('ორიდან ერთი დაიჭირეს — მეორე გაქცეულის ქულას იღებს', () => {
    const e = new ImpostorEngine(names(6));
    e.setImpostorCount(2);
    e.setCanGuess(true);
    e.startRound();
    const [caught, free] = e.impostors;
    e.beginVoting();
    e.accuse(caught);
    expect(e.guessOptions.length).toBe(10);
    expect(e.guessOptions).toContain(e.secretWord);
    e.submitGuess(e.guessOptions.find((w) => w !== e.secretWord)!);
    expect(e.outcome).toBe('impostorCaught');
    expect(e.roundPoints[caught.id]).toBeUndefined();
    expect(e.roundPoints[free.id]).toBe(3);
    for (const p of e.players) if (!e.isImpostor(p)) expect(e.roundPoints[p.id]).toBe(2);
  });
});

describe('Undercover — მისტერ უაითი', () => {
  it('ოთხზე მისტერ უაითი არ ირთვება, ხუთზე — კი', () => {
    const four = new SpyEngine(names(4));
    four.setIncludeMrWhite(true);
    expect(four.settings.includeMrWhite).toBe(false);
    const five = new SpyEngine(names(5));
    five.setIncludeMrWhite(true);
    expect(five.settings.includeMrWhite).toBe(true);
    expect(five.maxUndercovers).toBe(1);
  });

  it('ვარიანტებში ორივე სიტყვაა და დანარჩენი იმავე კატეგორიიდანაა', () => {
    const e = new SpyEngine(names(6));
    e.setIncludeMrWhite(true);
    e.startGame();
    const white = e.playersWith('mrWhite')[0];
    e.beginVoting();
    e.eliminate(white);
    expect(e.phase).toBe('mrWhiteGuess');
    expect(e.mrWhiteOptions).toHaveLength(6);
    expect(new Set(e.mrWhiteOptions).size).toBe(6);
    expect(e.mrWhiteOptions).toContain(e.civilianWord);
    expect(e.mrWhiteOptions).toContain(e.undercoverWord);
    const cat = PairBank.categories.find((c) => c.name === e.categoryLabel)!;
    const words = new Set(cat.pairs.flatMap((p) => [p.a, p.b]));
    for (const w of e.mrWhiteOptions) expect(words.has(w)).toBe(true);
  });
});

describe('Mafia — ღამის ქმედება მხოლოდ თავის ჯერზე', () => {
  it('ორმაგი შეხება შემდეგ მოთამაშეს ჯერს არ უტოვებს', () => {
    const [m, d, a, b] = names(4);
    const e = new MafiaEngine([m, d, a, b]);
    e.startGame();
    e.roles = { [m.id]: 'mafia', [d.id]: 'doctor', [a.id]: 'civilian', [b.id]: 'civilian' };
    for (let i = 0; i < 4; i++) e.advanceReveal();
    expect(e.currentNightPlayer?.id).toBe(m.id);
    e.mafiaChoose(a, m);
    e.mafiaChoose(a, m); // მეორე შეხება — უკვე ექიმის ჯერია
    expect(e.nightIndex).toBe(1);
    expect(e.mafiaVotes[a.id]).toBe(1);
    e.skipNightTurn(d); // ექიმი მოქალაქის ღილაკით ვერ გამოტოვებს
    expect(e.nightIndex).toBe(1);
    e.doctorSave(b, d);
    e.doctorSave(b, d);
    expect(e.nightIndex).toBe(2);
    e.skipNightTurn(a);
    e.skipNightTurn(a);
    expect(e.nightIndex).toBe(3);
    e.skipNightTurn(b);
    expect(e.phase).toBe('morning');
    expect(e.killed?.id).toBe(a.id);
  });
});

describe('WhoWrote / TwoTruths — ფრე', () => {
  it('ფრეზე გამარჯვებული ყველაა, ადგილი სპორტული წესით', () => {
    const [a, b, c] = names(3);
    const w = new WhoWroteEngine([a, b, c]);
    w.totals = { [a.id]: 4, [b.id]: 4, [c.id]: 2 };
    expect(w.winners.map((p) => p.id).sort()).toEqual([a.id, b.id].sort());
    expect([w.placeOf(a), w.placeOf(b), w.placeOf(c)]).toEqual([1, 1, 3]);
    const t = new TwoTruthsEngine([a, b, c]);
    expect(t.winners).toEqual([]);
    t.totals = { [c.id]: 2 };
    expect(t.winners.map((p) => p.id)).toEqual([c.id]);
  });
});

describe('ორი სიმართლე — ჯერი და ქულა', () => {
  it('ჯერები მთელი წრეებია — ყველა თანაბრად წერს', () => {
    const players = names(4);
    const e = new TwoTruthsEngine(players);
    e.setLaps(2);
    expect(e.totalTurns).toBe(8);
    const authored: Record<string, number> = {};
    e.startGame();
    for (let i = 0; i < e.totalTurns; i++) {
      authored[e.author.id] = (authored[e.author.id] ?? 0) + 1;
      e.beginWriting();
      e.submit(['ა', 'ბ', 'გ'], 0);
      while (e.phase === 'guessHandoff') { e.beginGuessing(); e.castGuess(0); }
      e.next();
    }
    expect(e.phase).toBe('summary');
    expect(players.map((p) => authored[p.id])).toEqual([2, 2, 2, 2]);
  });

  it('ძველი „8 ჯერი“ წრეებში გადადის', () => {
    setJSON('splash.twotruths.settings.v1', { everyonePlays: false, fixedTurns: 8, showHints: true });
    expect(new TwoTruthsEngine(names(4)).settings.laps).toBe(2);
  });

  it('ავტორი ყოველ მოტყუებულზე +2-ს იღებს, ჭერის გარეშე', () => {
    const e = new TwoTruthsEngine(names(6));
    e.startGame();
    e.beginWriting();
    e.submit(['ა', 'ბ', 'გ'], 0);
    const truth = e.displayPositionOf(1);
    while (e.phase === 'guessHandoff') { e.beginGuessing(); e.castGuess(truth); }
    expect(e.pointsFor(e.author)).toBe(10);
  });
});
