import { describe, it, expect, beforeEach } from 'vitest';
import { __resetForTests, setJSON } from '../src/core/storage';
import { NeverBank, WordBank } from '../src/content/banks';
import type { Player } from '../src/core/roster';
import { NeverEngine } from '../src/games/never/engine';
import { ImpostorEngine } from '../src/games/impostor/engine';
import { MostLikelyEngine } from '../src/games/mostlikely/engine';

/**
 * კატეგორიების მრავალჯერადი მონიშვნა — რამდენიმე კატეგორია ერთად,
 * `[]` — ყველა, ძველი `categoryID` კი `[id]`-ად გადმოდის.
 */

const NAMES = ['გიო', 'ნინო', 'ლაშა', 'მარი', 'დათო'];
let seq = 0;
const names = (n: number): Player[] =>
  NAMES.slice(0, n).map((name) => ({ id: `p${seq++}`, name, score: 0 }));

beforeEach(() => __resetForTests());

describe('კატეგორიების მონიშვნა', () => {
  it('ორი მონიშნული კატეგორია — დებულებები მხოლოდ ამ ორიდან', () => {
    const [a, b] = NeverBank.categories;
    const allowed = new Set([...a.items, ...b.items]);
    const e = new NeverEngine(names(3));
    e.setCategories([a.id, b.id]);
    e.startGame();
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      expect(allowed.has(e.currentStatement)).toBe(true);
      seen.add(e.currentStatement);
      e.skipStatement();
    }
    // ორივე კატეგორიიდან მოდის, არა მხოლოდ პირველიდან.
    expect([...seen].some((x) => a.items.includes(x) && !b.items.includes(x))).toBe(true);
    expect([...seen].some((x) => b.items.includes(x) && !a.items.includes(x))).toBe(true);
  });

  it('იმპოსტორი: სიტყვა და მინიშნება მონიშნული კატეგორიებიდან', () => {
    const [a, b] = WordBank.categories;
    const e = new ImpostorEngine(names(5));
    e.setCategories([b.id, a.id]);
    for (let i = 0; i < 20; i++) {
      e.startRound();
      expect([a.id, b.id]).toContain(e.category.id);
      expect(e.category.words).toContain(e.secretWord);
    }
  });

  it('[] — მთელი ბანკი', () => {
    const e = new NeverEngine(names(3));
    e.setCategories([]);
    expect(e.settings.categoryIDs).toEqual([]);
    e.startGame();
    expect(NeverBank.all).toContain(e.currentStatement);
    expect(NeverBank.deck([]).length).toBe(NeverBank.all.length);
  });

  it('არარსებული და გამეორებული id-ები ცვივა', () => {
    const id = NeverBank.categories[0].id;
    const e = new NeverEngine(names(3));
    e.setCategories([id, 'no-such-category', id]);
    expect(e.settings.categoryIDs).toEqual([id]);
  });

  it('ძველი შენახული categoryID გადმოდის [id]-ად', () => {
    const id = WordBank.categories[1].id;
    setJSON('splash.impostor.settings.v1', { impostorCount: 1, categoryID: id });
    expect(new ImpostorEngine(names(5)).settings.categoryIDs).toEqual([id]);

    setJSON('splash.mostlikely.settings.v1', { categoryID: 'no-such-category' });
    expect(new MostLikelyEngine(names(3)).settings.categoryIDs).toEqual([]);
  });
});
