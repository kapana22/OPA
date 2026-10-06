import { describe, it, expect } from 'vitest';
import {
  WordBank, CharadesBank, PairBank, PromptBank, SpectrumBank, DilemmaBank,
  AnswerPromptBank, IdentityBank, LaughBank, NeverBank, PointOneBank,
  StandardsBank, TenButBank, TwoTruthsBank, TruthDareBank, DareCardBank, RuleCardBank,
} from '../src/content/banks';

import raw from '../src/content/banks.generated.json';
import standards from '../src/content/games/standards.json';
import tenbut from '../src/content/games/tenbut.json';
import { gameTextCategories } from '../src/content/gameTextCategories';

/**
 * კონტენტის მთლიანობა.
 *
 * რიცხვები ხელით აღარ იწერება — ფაილიდან იკითხება ისე, როგორც მართლა წერია
 * (`banks.generated.json`, სიტყვების რედაქტორი მას ცვლის). ტესტი ამოწმებს,
 * რომ აპი ფაილში არსებულ **ყველაფერს** ტვირთავს: თუ ჩატვირთვისას რამე
 * დაიკარგა ან კატეგორია დაცარიელდა — გამოშვება არ უნდა გავიდეს.
 */

type RawCategory = Record<string, unknown> & { id: string };
const file = { ...raw, StandardsBank: gameTextCategories(standards), TenButBank: gameTextCategories(tenbut) } as unknown as Record<string, RawCategory[]>;

/** ფაილში: [ბანკი, ერთეულების ველი]. */
const FIELDS: [string, string][] = [
  ['WordBank', 'words'],
  ['CharadesBank', 'words'],
  ['PairBank', 'pairs'],
  ['PromptBank', 'prompts'],
  ['SpectrumBank', 'spectrums'],
  ['DilemmaBank', 'dilemmas'],
  ['AnswerPromptBank', 'items'],
  ['IdentityBank', 'items'],
  ['LaughBank', 'items'],
  ['NeverBank', 'items'],
  ['PointOneBank', 'items'],
  ['StandardsBank', 'items'],
  ['TenButBank', 'items'],
  ['TwoTruthsBank', 'items'],
];

const inFile = (bank: string, field: string) => ({
  cats: file[bank].length,
  items: file[bank].reduce((n, c) => n + ((c[field] as unknown[] | undefined)?.length ?? 0), 0),
});

const SIZES: Record<string, { cats: number; items: number }> = {
  WordBank: { cats: WordBank.categories.length, items: WordBank.categories.reduce((n, c) => n + c.words.length, 0) },
  CharadesBank: { cats: CharadesBank.categories.length, items: CharadesBank.categories.reduce((n, c) => n + c.words.length, 0) },
  PairBank: { cats: PairBank.categories.length, items: PairBank.categories.reduce((n, c) => n + c.pairs.length, 0) },
  // Most Likely To-ში Point at One-ის კითხვებიც დევს — ფაილის PromptBank-თან შესადარებლად ვაკლებთ.
  PromptBank: {
    cats: PromptBank.categories.filter((c) => raw.PromptBank.some((f) => f.id === c.id)).length,
    items: PromptBank.allEntries.length - PointOneBank.categories.reduce((n, c) => n + c.items.length, 0),
  },
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

const truthDareCount = (sets: readonly { truths: readonly unknown[]; dares: readonly unknown[] }[]) =>
  sets.reduce((n, s) => n + s.truths.length + s.dares.length, 0);

const fileTotal =
  FIELDS.reduce((n, [bank, field]) => n + inFile(bank, field).items, 0) +
  file.DareCardBank.length + file.RuleCardBank.length +
  truthDareCount(file.TruthDareBank as unknown as { truths: unknown[]; dares: unknown[] }[]);

describe('კონტენტის მთლიანობა', () => {
  it.each(FIELDS.map(([bank, field]) => [bank, inFile(bank, field).cats, inFile(bank, field).items, field] as const))(
    '%s — %i კატეგორია, %i ერთეული (ფაილიდან)',
    (bank, cats, items) => {
      expect(cats).toBeGreaterThan(0);
      expect(items).toBeGreaterThan(0);
      expect(SIZES[bank].cats).toBe(cats);
      expect(SIZES[bank].items).toBe(items);
    },
  );

  it('ცარიელი კატეგორია არ არსებობს', () => {
    for (const [bank, field] of FIELDS) {
      for (const cat of file[bank]) {
        expect((cat[field] as unknown[] | undefined)?.length ?? 0, `${bank}/${cat.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('ბარათული ბანკები — ფაილში რამდენიცაა, იმდენი იტვირთება', () => {
    expect(DareCardBank.all).toHaveLength(file.DareCardBank.length);
    expect(RuleCardBank.all).toHaveLength(file.RuleCardBank.length);
    expect(TruthDareBank.sets).toHaveLength(file.TruthDareBank.length);
    expect(truthDareCount(TruthDareBank.sets)).toBe(
      truthDareCount(file.TruthDareBank as unknown as { truths: unknown[]; dares: unknown[] }[]),
    );
    expect(DareCardBank.all.length).toBeGreaterThan(0);
    expect(RuleCardBank.all.length).toBeGreaterThan(0);
  });

  it(`სულ ${fileTotal} ერთეული — აპი ყველას ტვირთავს`, () => {
    const total =
      Object.values(SIZES).reduce((n, s) => n + s.items, 0) +
      DareCardBank.all.length + RuleCardBank.all.length + truthDareCount(TruthDareBank.sets);
    expect(total).toBe(fileTotal);
  });

  it('ყველა კატეგორიას აქვს ემოჯი და სახელი — JSON-ის ექსპორტს ეს აკლდა', () => {
    const cats = [
      ...WordBank.categories, ...CharadesBank.categories, ...PairBank.categories,
      ...PromptBank.categories, ...SpectrumBank.categories, ...DilemmaBank.categories,
      ...AnswerPromptBank.categories, ...IdentityBank.categories, ...LaughBank.categories,
      ...NeverBank.categories, ...PointOneBank.categories, ...StandardsBank.categories,
      ...TenButBank.categories, ...TwoTruthsBank.categories,
    ];
    expect(cats).toHaveLength(124); // PromptBank-ში Point at One-ის 3 ახალი კატეგორიაც ჩანს
    expect(cats.filter((c) => !c.emoji || !c.name || !c.id)).toEqual([]);
  });

  it('ყველა მიმდინარე კითხვას შენარჩუნებული აქვს ტონი', () => {
    const entries = PromptBank.allEntries;
    expect(entries).toHaveLength(inFile('PromptBank', 'prompts').items + inFile('PointOneBank', 'items').items);
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

  it('TruthDare-ს ზუსტად სამი სწორი დონის სრული დასტა აქვს', () => {
    const expected = { family: [45, 42], party: [49, 45], spicy: [58, 38] } as const;
    expect(raw.TruthDareBank).toHaveLength(3);
    for (const heat of ['family', 'party', 'spicy'] as const) {
      const set = TruthDareBank.set(heat)!;
      expect(Object.keys(set).sort()).toEqual(['dares', 'heat', 'truths']);
      expect(set.truths).toHaveLength(expected[heat][0]);
      expect(set.dares).toHaveLength(expected[heat][1]);
      for (const texts of [set.truths, set.dares]) {
        expect(new Set(texts).size).toBe(texts.length);
        expect(texts.every(t => typeof t === 'string' && t.trim())).toBe(true);
      }
      const allowed = heat === 'family' ? ['family'] : heat === 'party' ? ['family', 'party'] : ['party', 'spicy'];
      for (const wantTruths of [true, false]) {
        const texts = raw.TruthDareBank.filter(s => allowed.includes(s.heat)).flatMap(s => wantTruths ? s.truths : s.dares);
        expect(TruthDareBank.deck(heat, wantTruths).sort()).toEqual(texts.sort());
      }
    }
  });

  it('DareCard-ს ორივე ნიშანი აქვს — ტიპიც და სიცხარეც', () => {
    expect(DareCardBank.all.filter((c) => !c.kind || !c.heat)).toEqual([]);
    expect(DareCardBank.byHeat('family')).toHaveLength(38);
    expect(DareCardBank.byHeat('party')).toHaveLength(37);
    expect(DareCardBank.byHeat('spicy')).toHaveLength(30);
  });
});
