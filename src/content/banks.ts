import raw from './banks.generated.json';
import standards from './games/standards.json';
import tenbut from './games/tenbut.json';
import { gameTextCategories } from './gameTextCategories';
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

/**
 * კატეგორიების მონიშვნა: ერთი id (ძველი ფორმა), რამდენიმე id, ან `null`/`[]` — ყველა.
 */
export type CategorySelection = string | readonly string[] | null | undefined;

/**
 * მონიშნული კატეგორიები ბანკის რიგით. `undefined` — მონიშვნა ცარიელია ან
 * არცერთი id აღარ არსებობს, ანუ მთელი ბანკი.
 */
export function selectedCategories<T extends { id: string }>(list: T[], sel: CategorySelection): T[] | undefined {
  const ids = sel == null ? [] : typeof sel === 'string' ? [sel] : sel;
  if (ids.length === 0) return undefined;
  const picked = list.filter((c) => ids.includes(c.id));
  return picked.length > 0 ? picked : undefined;
}

/**
 * მონიშვნის სახელი ეკრანისთვის: ცარიელი — „ყველა კატეგორია“, ერთი ან ორი —
 * სახელებით, მეტი — „3 კატეგორია“.
 */
export function selectionName(list: { id: string; name: string }[], sel: CategorySelection): string {
  const cats = selectedCategories(list, sel);
  if (!cats) return 'ყველა კატეგორია';
  if (cats.length <= 2) return cats.map((c) => c.name).join(', ');
  return `${cats.length} კატეგორია`;
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
    /** მონიშნული კატეგორიების გაერთიანება (დუბლიკატების გარეშე); ცარიელი — მთელი ბანკი. */
    deck: (sel: CategorySelection) => {
      const cats = selectedCategories(categories, sel);
      return shuffled(cats ? unique(cats.flatMap((c) => c.items)) : all);
    },
  };
}

// MARK: - სიტყვების ბანკები

function wordBank(categories: WordCategory[]) {
  const all = unique(categories.flatMap((c) => c.words));
  return {
    categories,
    all,
    category: (id: string | null | undefined) => find(categories, id),
    /** შემთხვევითი კატეგორია მონიშნულებიდან (ცარიელი მონიშვნა — ყველადან). */
    randomCategory: (sel?: CategorySelection): WordCategory => {
      const pool = selectedCategories(categories, sel) ?? categories;
      return pool[Math.floor(Math.random() * pool.length)];
    },
    deck: (sel: CategorySelection) => {
      const cats = selectedCategories(categories, sel);
      return shuffled(cats ? unique(cats.flatMap((c) => c.words)) : all);
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
  pairs: (sel: CategorySelection) =>
    (selectedCategories(B.PairBank, sel) ?? B.PairBank).flatMap((c) => c.pairs),
  /** დასტის გასაღები `"a|b"`-ია — `ContentShoe` სტრიქონებზე მუშაობს. */
  deck: (sel: CategorySelection) =>
    shuffled(PairBank.pairs(sel).map((p) => `${p.a}|${p.b}`)),
  /**
   * გასაღებით პოვნა — წყვილიც და კატეგორიაც. ერთი წყვილი ორ კატეგორიაშიც
   * შეიძლება იყოს — `sel`-ით მონიშნული კატეგორია პირველი მოწმდება.
   */
  pair: (key: string, sel?: CategorySelection): { pair: { a: string; b: string }; category: PairCategory } | undefined => {
    const first = selectedCategories(B.PairBank, sel) ?? [];
    for (const c of [...first, ...B.PairBank]) {
      const found = c.pairs.find((p) => `${p.a}|${p.b}` === key);
      if (found) return { pair: found, category: c };
    }
    return undefined;
  },
  /** სათადარიგო გზა — დასტა ცარიელი რომ აღმოჩნდეს. */
  randomPair: (sel: CategorySelection) => {
    const pool = selectedCategories(B.PairBank, sel) ?? B.PairBank;
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

/**
 * Most Likely To-ს კითხვები. Point at One ცალკე თამაში აღარაა — მისი კითხვები
 * (`PointOneBank`, რედაქტორში ისევ ცალკე ჩანს) აქ ემატება: ერთნაირი id-ის
 * კატეგორია ერთდება, დანარჩენი ახალ კატეგორიად ჩნდება.
 */
const PROMPT_CATEGORIES: PromptCategory[] = (() => {
  const merged = B.PromptBank.map((c) => ({ ...c, prompts: [...c.prompts] }));
  for (const extra of B.PointOneBank) {
    const extraPrompts = extra.items.map((text) => ({ text, register: 'playful' as PromptRegister }));
    const same = merged.find((c) => c.id === extra.id);
    if (same) {
      const seen = new Set(same.prompts.map((p) => p.text));
      same.prompts.push(...extraPrompts.filter((p) => !seen.has(p.text)));
    } else {
      const { items: _items, ...base } = extra;
      merged.push({ ...base, prompts: extraPrompts });
    }
  }
  return merged;
})();

export const PromptBank = {
  categories: PROMPT_CATEGORIES,
  all: unique(PROMPT_CATEGORIES.flatMap((c) => c.prompts.map((p) => p.text))),
  allEntries: PROMPT_CATEGORIES.flatMap((c) => c.prompts),
  category: (id: string | null | undefined) => find(PROMPT_CATEGORIES, id),
  /** ტონი ეკრანზე არ ჩანს — ფილტრისთვისაა. */
  registerOf: (text: string): PromptRegister =>
    PROMPT_CATEGORIES.flatMap((c) => c.prompts).find((p) => p.text === text)?.register ?? 'playful',
  deck: (sel: CategorySelection) => {
    const cats = selectedCategories(PROMPT_CATEGORIES, sel);
    return shuffled(cats ? unique(cats.flatMap((c) => c.prompts.map((p) => p.text))) : PromptBank.all);
  },
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
export const StandardsBank = textBank(gameTextCategories(standards));
export const TenButBank = textBank(gameTextCategories(tenbut));
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
