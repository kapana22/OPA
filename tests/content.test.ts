import { describe, it, expect } from 'vitest';
import {
  WordBank, CharadesBank, PairBank, PromptBank, SpectrumBank, DilemmaBank,
  AnswerPromptBank, IdentityBank, LaughBank, NeverBank, PointOneBank,
  StandardsBank, TenButBank, TwoTruthsBank, TruthDareBank, DareCardBank, RuleCardBank,
} from '../src/content/banks';

/**
 * კონტენტის მთლიანობა.
 *
 * რიცხვები Swift-ის წყაროდანაა და Word-ის ექსპორტთანაც ემთხვევა.
 * თუ რომელიმე დაეცემა — კონტენტი დაიკარგა და გამოშვება არ უნდა გავიდეს.
 */

const EXPECTED: [string, number, number][] = [
  // [ბანკი, კატეგორია, ერთეული]
  ['WordBank', 33, 1694],
  ['CharadesBank', 11, 553],
  ['PairBank', 16, 593],
  ['PromptBank', 10, 659],
  ['SpectrumBank', 5, 291],
  ['DilemmaBank', 5, 316],
  ['AnswerPromptBank', 5, 355],
  ['IdentityBank', 5, 437],
  ['LaughBank', 5, 247],
  ['NeverBank', 5, 230],
  ['PointOneBank', 5, 290],
  ['StandardsBank', 5, 238],
  ['TenButBank', 5, 215],
  ['TwoTruthsBank', 6, 227],
];

const SIZES: Record<string, { cats: number; items: number }> = {
  WordBank: { cats: WordBank.categories.length, items: WordBank.categories.reduce((n, c) => n + c.words.length, 0) },
  CharadesBank: { cats: CharadesBank.categories.length, items: CharadesBank.categories.reduce((n, c) => n + c.words.length, 0) },
  PairBank: { cats: PairBank.categories.length, items: PairBank.categories.reduce((n, c) => n + c.pairs.length, 0) },
  PromptBank: { cats: PromptBank.categories.length, items: PromptBank.categories.reduce((n, c) => n + c.prompts.length, 0) },
  SpectrumBank: { cats: SpectrumBank.categories.length, items: SpectrumBank.categories.reduce((n, c) => n + c.spectrums.length, 0) },
  DilemmaBank: { cats: DilemmaBank.categories.length, items: DilemmaBank.categories.reduce((n, c) => n + c.dilemmas.length, 0) },
  AnswerPromptBank: { cats: AnswerPromptBank.categories.length, items: AnswerPromptBank.categories.reduce((n, c) => n + c.items.length, 0) },
  IdentityBank: { cats: IdentityBank.categories.length, items: IdentityBank.categories.reduce((n, c) => n + c.items.length, 0) },
  LaughBank: { cats: LaughBank.categories.length, items: LaughBank.categories.reduce((n, c) => n + c.items.length, 0) },
  NeverBank: { cats: NeverBank.categories.length, items: NeverBank.categories.reduce((n, c) => n + c.items.length, 0) },
  PointOneBank: { cats: PointOneBank.categories.length, items: PointOneBank.categories.reduce((n, c) => n + c.items.length, 0) },
  StandardsBank: { cats: StandardsBank.categories.length, items: StandardsBank.categories.reduce((n, c) => n + c.items.length, 0) },
  TenButBank: { cats: TenButBank.categories.length, items: TenButBank.categories.reduce((n, c) => n + c.items.length, 0) },
  TwoTruthsBank: { cats: TwoTruthsBank.categories.length, items: TwoTruthsBank.categories.reduce((n, c) => n + c.items.length, 0) },
};

describe('კონტენტის მთლიანობა', () => {
  it.each(EXPECTED)('%s — %i კატეგორია, %i ერთეული', (bank, cats, items) => {
    expect(SIZES[bank].cats).toBe(cats);
    expect(SIZES[bank].items).toBe(items);
  });

  it('ბარათული ბანკები', () => {
    expect(DareCardBank.all).toHaveLength(105);
    expect(RuleCardBank.all).toHaveLength(97);
    expect(TruthDareBank.sets).toHaveLength(3);
    expect(TruthDareBank.sets.reduce((n, s) => n + s.truths.length + s.dares.length, 0)).toBe(217);
  });

  it('სულ 6764 ერთეული', () => {
    const total =
      Object.values(SIZES).reduce((n, s) => n + s.items, 0) +
      DareCardBank.all.length + RuleCardBank.all.length +
      TruthDareBank.sets.reduce((n, s) => n + s.truths.length + s.dares.length, 0);
    expect(total).toBe(6764);
  });

  it('ყველა კატეგორიას აქვს ემოჯი და სახელი — JSON-ის ექსპორტს ეს აკლდა', () => {
    const cats = [
      ...WordBank.categories, ...CharadesBank.categories, ...PairBank.categories,
      ...PromptBank.categories, ...SpectrumBank.categories, ...DilemmaBank.categories,
      ...AnswerPromptBank.categories, ...IdentityBank.categories, ...LaughBank.categories,
      ...NeverBank.categories, ...PointOneBank.categories, ...StandardsBank.categories,
      ...TenButBank.categories, ...TwoTruthsBank.categories,
    ];
    expect(cats).toHaveLength(121);
    expect(cats.filter((c) => !c.emoji || !c.name || !c.id)).toEqual([]);
  });

  it('კითხვის ტონი შენარჩუნებულია — 659 ჩანაწერი', () => {
    const entries = PromptBank.allEntries;
    expect(entries).toHaveLength(659);
    expect(entries.filter((p) => !['mild', 'playful', 'bold'].includes(p.register))).toEqual([]);
  });

  it('დილემას სამივე ველი ცალკეა — JSON მათ ერთ სტრიქონად ჭყლეტდა', () => {
    expect(DilemmaBank.all.filter((d) => !d.question || !d.a || !d.b)).toEqual([]);
    const first = DilemmaBank.category('daily')!.dilemmas[0];
    expect(first).toEqual({ question: 'რით იწყებ დილას?', a: 'ყავით', b: 'ჩაით' });
  });

  it('სიტყვა კატეგორიაში არ მეორდება', () => {
    for (const c of WordBank.categories) {
      expect(new Set(c.words).size).toBe(c.words.length);
    }
  });

  it('„შვება“ ჩვეულებრივ დასტაში არ დევს — სარქველია', () => {
    const main = RuleCardBank.mainDeck();
    const reliefs = new Set(RuleCardBank.byKind('relief').map((c) => c.text));
    expect(main.filter((t) => reliefs.has(t))).toEqual([]);
    expect(RuleCardBank.reliefDeck()).toHaveLength(5);
  });
});

describe('სიცხარის დონეები ერთმანეთზე დგას', () => {
  it('DareCard: „წვეულება“ ოჯახურსაც შეიცავს, „ცხარე“ კი ოჯახურს — არა', () => {
    const family = new Set(DareCardBank.deck('family'));
    const party = new Set(DareCardBank.deck('party'));
    const spicy = new Set(DareCardBank.deck('spicy'));
    expect([...family].every((t) => party.has(t))).toBe(true);
    expect([...family].some((t) => spicy.has(t))).toBe(false);
    expect(family.size).toBeGreaterThanOrEqual(30);
    expect(party.size).toBeGreaterThanOrEqual(60);
    expect(spicy.size).toBeGreaterThanOrEqual(60);
  });

  it('TruthDare: იგივე კასკადი მოქმედებს', () => {
    const family = new Set(TruthDareBank.deck('family', true));
    const party = new Set(TruthDareBank.deck('party', true));
    const spicy = new Set(TruthDareBank.deck('spicy', true));
    expect([...family].every((t) => party.has(t))).toBe(true);
    expect([...family].some((t) => spicy.has(t))).toBe(false);
  });

  it('DareCard-ს ორივე ნიშანი აქვს — ტიპიც და სიცხარეც', () => {
    expect(DareCardBank.all.filter((c) => !c.kind || !c.heat)).toEqual([]);
    expect(DareCardBank.byHeat('family')).toHaveLength(38);
    expect(DareCardBank.byHeat('party')).toHaveLength(37);
    expect(DareCardBank.byHeat('spicy')).toHaveLength(30);
  });
});
