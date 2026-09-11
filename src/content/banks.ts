import raw from './banks.generated.json';
import { shuffled } from '../core/shuffle';
import { ContentShoe } from '../core/contentShoe';

/**
 * კონტენტის ბაზები.
 *
 * წყარო `Splash/Data/*.swift`-ია, ამოღებული `tools/extract-banks.mjs`-ით და
 * Word-ის ექსპორტთან ჯვარედინად შემოწმებული (ორივემ 6,764 უნდა თქვას).
 * ატრიბუტები — ემოჯი, კითხვის ტონი, დილემის სამი ველი — მხოლოდ Swift-ის
 * წყაროშია, ამიტომ JSON-ს არ ვენდობით.
 *
 * API Swift-ის ბანკების ფორმას იმეორებს: `categories` · `all…` ·
 * `category(id)` · `deck(categoryID)`.
 */

// MARK: - ტიპები

export type PromptRegister = 'mild' | 'playful' | 'bold';
export type TruthDareHeat = 'family' | 'party' | 'spicy';
export type DareKind = 'solo' | 'group' | 'target' | 'duel';
export type RuleCardKind = 'rule' | 'now' | 'game' | 'vote' | 'relief';

export interface CategoryBase {
  id: string;
  name: string;
  emoji: string;
}
export interface WordCategory extends CategoryBase {
  words: string[];
}
export interface PairCategory extends CategoryBase {
  pairs: { a: string; b: string }[];
}
export interface PromptCategory extends CategoryBase {
  prompts: { text: string; register: PromptRegister }[];
}
export interface SpectrumCategory extends CategoryBase {
  spectrums: { left: string; right: string }[];
}
export interface DilemmaCategory extends CategoryBase {
  dilemmas: { question: string; a: string; b: string }[];
}
export interface TextCategory extends CategoryBase {
  items: string[];
}
export interface TruthDareSet {
  heat: TruthDareHeat;
  truths: string[];
  dares: string[];
}
export interface DareCard {
  text: string;
  kind: DareKind;
  /** რომელ სიცხარის დასტაშია — `kind`-ისგან დამოუკიდებელი ნიშანი. */
  heat: TruthDareHeat;
}
export interface RuleCard {
  text: string;
  kind: RuleCardKind;
  short: string | null;
}

interface RawBanks {
  WordBank: WordCategory[];
  CharadesBank: WordCategory[];
  PairBank: PairCategory[];
  PromptBank: PromptCategory[];
  SpectrumBank: SpectrumCategory[];
  DilemmaBank: DilemmaCategory[];
  AnswerPromptBank: TextCategory[];
  IdentityBank: TextCategory[];
  LaughBank: TextCategory[];
  NeverBank: TextCategory[];
  PointOneBank: TextCategory[];
  StandardsBank: TextCategory[];
  TenButBank: TextCategory[];
  TwoTruthsBank: TextCategory[];
  TruthDareBank: TruthDareSet[];
  DareCardBank: DareCard[];
  RuleCardBank: RuleCard[];
}

const B = raw as unknown as RawBanks;

// MARK: - დამხმარეები

function find<T extends { id: string }>(list: T[], id: string | null | undefined): T | undefined {
  return id ? list.find((c) => c.id === id) : undefined;
}

/** უნიკალურობის შენარჩუნებით გაერთიანება — ერთი სიტყვა ორ კატეგორიაშიც გვხვდება. */
function unique(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((x) => (seen.has(x) ? false : (seen.add(x), true)));
}

/** ტექსტური ბანკის სტანდარტული ფორმა — Swift-ის `categories/all/category/deck`. */
function textBank(categories: TextCategory[]) {
  const all = unique(categories.flatMap((c) => c.items));
  return {
    categories,
    all,
    category: (id: string | null | undefined) => find(categories, id),
    deck: (categoryID: string | null | undefined) => shuffled(find(categories, categoryID)?.items ?? all),
  };
}

// MARK: - სიტყვების ბანკები

function wordBank(categories: WordCategory[]) {
  const all = unique(categories.flatMap((c) => c.words));
  return {
    categories,
    all,
    category: (id: string | null | undefined) => find(categories, id),
    /** შემთხვევითი კატეგორია — `BombEngine`-ს სჭირდება, როცა დასტა ამოიწურა. */
    randomCategory: (): WordCategory => categories[Math.floor(Math.random() * categories.length)],
    deck: (categoryID: string | null | undefined) => {
      const cat = find(categories, categoryID);
      if (cat) return shuffled(cat.words);
      return shuffled(all);
    },
  };
}

export const WordBank = wordBank(B.WordBank);
export const CharadesBank = wordBank(B.CharadesBank);

// MARK: - წყვილები

export const PairBank = {
  categories: B.PairBank,
  all: B.PairBank.flatMap((c) => c.pairs),
  allWords: unique(B.PairBank.flatMap((c) => c.pairs.flatMap((p) => [p.a, p.b]))),
  category: (id: string | null | undefined) => find(B.PairBank, id),
  pairs: (categoryID: string | null | undefined) =>
    find(B.PairBank, categoryID)?.pairs ?? B.PairBank.flatMap((c) => c.pairs),
  /** დასტის გასაღები `"a|b"`-ია — `ContentShoe` სტრიქონებზე მუშაობს. */
  deck: (categoryID: string | null | undefined) =>
    shuffled(PairBank.pairs(categoryID).map((p) => `${p.a}|${p.b}`)),
  /** გასაღებით პოვნა — წყვილიც და კატეგორიაც. */
  pair: (key: string): { pair: { a: string; b: string }; category: PairCategory } | undefined => {
    for (const c of B.PairBank) {
      const found = c.pairs.find((p) => `${p.a}|${p.b}` === key);
      if (found) return { pair: found, category: c };
    }
    return undefined;
  },
  /** სათადარიგო გზა — დასტა ცარიელი რომ აღმოჩნდეს. */
  randomPair: (categoryID: string | null | undefined) => {
    const cats = categoryID ? [find(B.PairBank, categoryID)].filter((c): c is PairCategory => !!c) : B.PairBank;
    const pool = cats.length > 0 ? cats : B.PairBank;
    const category = pool[Math.floor(Math.random() * pool.length)];
    const pair = category.pairs[Math.floor(Math.random() * category.pairs.length)];
    return { pair, category };
  },
  /** `"a|b"` → წყვილი. */
  parse: (key: string): { a: string; b: string } => {
    const i = key.indexOf('|');
    return i === -1 ? { a: key, b: key } : { a: key.slice(0, i), b: key.slice(i + 1) };
  },
};

// MARK: - კითხვები ტონით

export const PromptBank = {
  categories: B.PromptBank,
  all: unique(B.PromptBank.flatMap((c) => c.prompts.map((p) => p.text))),
  allEntries: B.PromptBank.flatMap((c) => c.prompts),
  category: (id: string | null | undefined) => find(B.PromptBank, id),
  /** ტონი ეკრანზე არ ჩანს — ფილტრისთვისაა. */
  registerOf: (text: string): PromptRegister =>
    B.PromptBank.flatMap((c) => c.prompts).find((p) => p.text === text)?.register ?? 'playful',
  deck: (categoryID: string | null | undefined) =>
    shuffled(find(B.PromptBank, categoryID)?.prompts.map((p) => p.text) ?? PromptBank.all),
};

// MARK: - სპექტრი და დილემა

export const SpectrumBank = {
  categories: B.SpectrumBank,
  all: B.SpectrumBank.flatMap((c) => c.spectrums),
  category: (id: string | null | undefined) => find(B.SpectrumBank, id),
  deck: (categoryID: string | null | undefined) =>
    shuffled((find(B.SpectrumBank, categoryID)?.spectrums ?? SpectrumBank.all).map((s) => `${s.left}|${s.right}`)),
  parse: (key: string): { left: string; right: string } => {
    const i = key.indexOf('|');
    return i === -1 ? { left: key, right: key } : { left: key.slice(0, i), right: key.slice(i + 1) };
  },
};

export const DilemmaBank = {
  categories: B.DilemmaBank,
  all: B.DilemmaBank.flatMap((c) => c.dilemmas),
  category: (id: string | null | undefined) => find(B.DilemmaBank, id),
  /** გასაღები `"a|b"`-ია, როგორც Swift-ის `Dilemma.id`. */
  deck: (categoryID: string | null | undefined) =>
    shuffled((find(B.DilemmaBank, categoryID)?.dilemmas ?? DilemmaBank.all).map((d) => `${d.a}|${d.b}`)),
  byKey: (key: string) => DilemmaBank.all.find((d) => `${d.a}|${d.b}` === key),
};

// MARK: - ტექსტური ბანკები

export const AnswerPromptBank = textBank(B.AnswerPromptBank);
export const IdentityBank = textBank(B.IdentityBank);
export const LaughBank = textBank(B.LaughBank);
export const NeverBank = textBank(B.NeverBank);
export const PointOneBank = textBank(B.PointOneBank);
export const StandardsBank = textBank(B.StandardsBank);
export const TenButBank = textBank(B.TenButBank);
export const TwoTruthsBank = {
  ...textBank(B.TwoTruthsBank),
  /**
   * მინიშნებები წერისას — თითო სხვა კატეგორიიდან, ემოჯით.
   * თითოეულ კატეგორიას თავისი დასტა აქვს, რომ ერთი და იგივე მინიშნება
   * ზედიზედ არ დადგეს.
   */
  nudges: (count = 3): { emoji: string; text: string }[] =>
    shuffled(B.TwoTruthsBank)
      .slice(0, Math.max(1, count))
      .map((cat) => {
        const shoe = new ContentShoe(`twotruths.hint.${cat.id}`, cat.items);
        const text = shoe.draw();
        return text === null ? null : { emoji: cat.emoji, text };
      })
      .filter((x): x is { emoji: string; text: string } => x !== null),
};

// MARK: - ბარათული ბანკები

export const heatName: Record<TruthDareHeat, string> = {
  family: 'ოჯახური',
  party: 'წვეულება',
  spicy: 'ცხარე',
};
export const heatNote: Record<TruthDareHeat, string> = {
  family: 'ყველა ასაკს გამოადგება — სუფრაზეც და ბავშვებთანაც.',
  party: 'მეგობრებში, ხმაურით — ოდნავ უხერხული, მაგრამ უსაფრთხო.',
  spicy: 'პირადი კითხვები და თამამი დავალებები — მხოლოდ თავის ხალხში.',
};

/**
 * დონეები **ერთმანეთზე დგას**: „წვეულება“ ოჯახურსაც შეიცავს, „ცხარე“ კი
 * წვეულებასაც — თორემ ცხარე რეჟიმში მაგიდა მხოლოდ მძიმე ბარათებს მიიღებდა
 * და საღამო დაიღლებოდა. „ცხარე“ ოჯახურს განზრახ **არ** შეიცავს.
 */
const HEAT_CHAIN: Record<TruthDareHeat, TruthDareHeat[]> = {
  family: ['family'],
  party: ['family', 'party'],
  spicy: ['party', 'spicy'],
};

export const TruthDareBank = {
  sets: B.TruthDareBank,
  set: (heat: TruthDareHeat) => B.TruthDareBank.find((s) => s.heat === heat),
  truths: (heat: TruthDareHeat) => TruthDareBank.set(heat)?.truths ?? [],
  dares: (heat: TruthDareHeat) => TruthDareBank.set(heat)?.dares ?? [],
  /** სიცხარის მიხედვით დაწყობილი დასტა (`truths` ან `dares`). */
  deck: (heat: TruthDareHeat, wantTruths: boolean) => {
    const allowed = new Set(HEAT_CHAIN[heat]);
    return shuffled(
      B.TruthDareBank.filter((s) => allowed.has(s.heat)).flatMap((s) => (wantTruths ? s.truths : s.dares)),
    );
  },
};

export const dareKindLabel: Record<DareKind, string> = {
  solo: 'შენ', group: 'ყველა', target: 'აირჩიე', duel: 'დუელი',
};
export const dareKindIcon: Record<DareKind, string> = {
  solo: 'person.fill', group: 'person.3.fill', target: 'hand.point.right.fill', duel: 'bolt.fill',
};

export const DareCardBank = {
  all: B.DareCardBank,
  byKind: (kind: DareKind) => B.DareCardBank.filter((c) => c.kind === kind),
  byHeat: (heat: TruthDareHeat) => B.DareCardBank.filter((c) => c.heat === heat),
  card: (text: string) => B.DareCardBank.find((c) => c.text === text),
  /** სიცხარის მიხედვით — დონეები ერთმანეთზე დგას (იხ. `HEAT_CHAIN`). */
  cards: (heat: TruthDareHeat) => {
    const allowed = new Set(HEAT_CHAIN[heat]);
    return B.DareCardBank.filter((c) => allowed.has(c.heat));
  },
  deck: (heat: TruthDareHeat) => shuffled(DareCardBank.cards(heat).map((c) => c.text)),
};

export const ruleKindLabel: Record<RuleCardKind, string> = {
  rule: 'წესი', now: 'ახლავე', game: 'მინი-თამაში', vote: 'კენჭისყრა', relief: 'შვება',
};
export const ruleKindIcon: Record<RuleCardKind, string> = {
  rule: 'checklist', now: 'bolt.fill', game: 'gamecontroller.fill',
  vote: 'hand.point.up.left.fill', relief: 'wind',
};

export const RuleCardBank = {
  all: B.RuleCardBank,
  byKind: (kind: RuleCardKind) => B.RuleCardBank.filter((c) => c.kind === kind),
  card: (text: string) => B.RuleCardBank.find((c) => c.text === text),
  /**
   * ჩვეულებრივი დასტა — **„შვება“ განზრახ არ დევს.**
   * ის სარქველია: მხოლოდ მაშინ მოდის, როცა წესებმა ჭერს მიაღწია.
   */
  mainDeck: () => shuffled(B.RuleCardBank.filter((c) => c.kind !== 'relief').map((c) => c.text)),
  reliefDeck: () => shuffled(B.RuleCardBank.filter((c) => c.kind === 'relief').map((c) => c.text)),
};
