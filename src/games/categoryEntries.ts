import { ContentShoe } from '../core/contentShoe';
import type { PickerEntry } from '../ui/Cards';
import type { CategoryBase } from '../content/banks';

/**
 * კატეგორიის ჩიპებისთვის რაოდენობები — „🍕 საკვები · 56 · დარჩა 8“.
 *
 * გასაღებები **ზუსტად** ძრავების გასაღებებს იმეორებს (`word.<id>`,
 * `prompt.<id|all>`…) — თორემ ჩიპი ერთ დასტას დაითვლის, ძრავი კი სხვას
 * დაარიგებს. ახალი ბანკის დამატებისას ორივე ერთად უნდა შეიცვალოს.
 */

interface Bank<C extends CategoryBase> {
  categories: C[];
  all: readonly string[];
}

function entry(id: string | null, label: string, key: string | null, pool: readonly string[]): PickerEntry {
  return { id, label, count: pool.length, remaining: key ? ContentShoe.remaining(key, pool) : null };
}

const chipLabel = (c: CategoryBase) => `${c.emoji} ${c.name}`;

/**
 * სიტყვების ბანკი (`WordBank`, `CharadesBank`).
 *
 * @param allKey „ყველა“-ს დასტის გასაღები (`word.charades-all`), ან `null`, თუ
 *   „შემთხვევითი“ ყოველ რაუნდზე სხვა კატეგორიას იღებს — მაშინ დარჩენილი
 *   კატეგორიების ჯამია.
 * @param tracked `false` — თამაში სიტყვებს არ არიგებს (ბომბი: მხოლოდ კატეგორიის სახელი ჩანს).
 */
export function wordEntries(
  bank: Bank<CategoryBase & { words: string[] }>,
  allLabel: string,
  allKey: string | null,
  tracked = true,
): PickerEntry[] {
  const cats = bank.categories.map((c) => entry(c.id, chipLabel(c), tracked ? `word.${c.id}` : null, c.words));
  const all: PickerEntry = allKey
    ? entry(null, allLabel, tracked ? allKey : null, bank.all)
    : {
        id: null,
        label: allLabel,
        count: bank.all.length,
        remaining: tracked ? cats.reduce((sum, c) => sum + (c.remaining ?? 0), 0) : null,
      };
  return [all, ...cats];
}

/** ტექსტური ბანკები — `<prefix>.<id|all>` (never, laugh, pointone, standards, tenbut, identity, answerprompt). */
export function textEntries(bank: Bank<CategoryBase & { items: string[] }>, prefix: string, allLabel = 'ყველა'): PickerEntry[] {
  return [
    entry(null, allLabel, `${prefix}.all`, bank.all),
    ...bank.categories.map((c) => entry(c.id, chipLabel(c), `${prefix}.${c.id}`, c.items)),
  ];
}

/** ბანკები, სადაც ჩანაწერი ცალკე გასაღებად იშლება (`a|b`) — წყვილები, სპექტრები, დილემები, კითხვები. */
export function keyedEntries<C extends CategoryBase>(
  bank: { categories: C[] },
  prefix: string,
  keysOf: (c: C) => string[],
  allLabel = 'ყველა',
): PickerEntry[] {
  const seen = new Set<string>();
  const allKeys = bank.categories.flatMap(keysOf).filter((k) => (seen.has(k) ? false : (seen.add(k), true)));
  return [
    entry(null, allLabel, `${prefix}.all`, allKeys),
    ...bank.categories.map((c) => entry(c.id, chipLabel(c), `${prefix}.${c.id}`, keysOf(c))),
  ];
}
