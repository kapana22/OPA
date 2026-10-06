import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { GameCatalog, game, matches, needles } from '../src/games/catalog';
import { StandardsEngine } from '../src/games/standards/engine';
import { StandardsBank, TenButBank } from '../src/content/banks';
import { gameTextCategories } from '../src/content/gameTextCategories';
import standards from '../src/content/games/standards.json';
import tenbut from '../src/content/games/tenbut.json';
import herd from '../src/content/games/herd.json';
import { HERD_QUESTIONS } from '../src/games/herd/questions';
import { __resetForTests } from '../src/core/storage';

beforeEach(() => __resetForTests());

describe('Standalone games', () => {
  it('exposes every former nested game with its own rules and cover', () => {
    expect(game('tableread')).toBeUndefined();
    const artwork = readFileSync(resolve('src/games/artwork.ts'), 'utf8');
    const flows = readFileSync(resolve('src/games/flows.ts'), 'utf8');
    for (const id of ['herd', 'standards', 'tenbut']) {
      expect(game(id)?.howTo.length).toBeGreaterThan(0);
      expect(flows).toContain(`registerGame('${id}',`);
    }
    for (const item of GameCatalog) {
      const path = artwork.match(new RegExp(`${item.id}: require\\('([^']+)'\\)`))?.[1];
      expect(path, item.id).toBeTruthy();
      expect(existsSync(resolve('src/games', path!)), item.id).toBe(true);
    }
    expect(matches(game('standards')!, needles("Where's the Line"))).toBe(true);
    expect(matches(game('tenbut')!, needles('10/10'))).toBe(true);
  });

  it('loads every separate editable text without losing categories', () => {
    expect(StandardsBank.categories.flatMap((c) => c.items).sort()).toEqual(standards.items.map((i) => i.text).sort());
    expect(TenButBank.categories.flatMap((c) => c.items).sort()).toEqual(tenbut.items.map((i) => i.text).sort());
    expect(HERD_QUESTIONS).toEqual(herd.questions.map((i) => i.text));
    for (const items of [standards.items, tenbut.items, herd.questions]) {
      expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    }
  });

  it('includes new editor entries and honors edits and deletions', () => {
    const source = structuredClone(standards);
    const removed = source.items.shift()!;
    source.items[0].text = 'შეცვლილი სიტუაცია';
    source.items.push({ id: 'editor_new', text: 'ახალი სიტუაცია' });
    const categories = gameTextCategories(source);
    const all = categories.flatMap((c) => c.items);
    expect(all).not.toContain(removed.text);
    expect(all).toContain('შეცვლილი სიტუაცია');
    expect(categories.find((c) => c.id === 'editor_added')?.items).toEqual(['ახალი სიტუაცია']);
  });
});

describe('Where’s the Line conversation', () => {
  it('goes directly from setup to discussion and advances without player input', () => {
    const engine = new StandardsEngine();
    engine.next();
    expect(engine.phase).toBe('setup');
    engine.startGame();
    const first = engine.currentExpectation;
    expect(first.length).toBeGreaterThan(0);
    engine.next();
    expect(engine.phase).toBe('discussion');
    expect(engine.currentExpectation).not.toBe(first);
    expect(engine).not.toHaveProperty('verdicts');
    expect(engine).not.toHaveProperty('totals');
  });

  it('keeps the selected category and remembers previously shown cards across games', () => {
    const category = StandardsBank.categories[0];
    const seen: string[] = [];
    for (let session = 0; session < 2; session++) {
      const engine = new StandardsEngine();
      if (!session) engine.setCategories([category.id]);
      expect(engine.settings.categoryIDs).toEqual([category.id]);
      engine.startGame();
      for (let turn = 0; turn < 4; turn++) {
        expect(category.items).toContain(engine.currentExpectation);
        seen.push(engine.currentExpectation);
        if (turn < 3) engine.next();
      }
    }
    expect(new Set(seen).size).toBe(seen.length);
  });
});

describe('ფოტოები', () => {
  it('ორ თამაშს ერთი ფოტო არ აქვს', () => {
    const artwork = readFileSync(resolve('src/games/artwork.ts'), 'utf8');
    const files = [...artwork.matchAll(/require\('([^']+)'\)/g)].map((m) => m[1]);
    expect(files.length).toBeGreaterThan(0);
    expect(new Set(files).size).toBe(files.length);
  });
});
