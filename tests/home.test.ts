import { describe, it, expect } from 'vitest';
import { DEFAULT_POPULAR, popularIDs } from '../src/state/popular';

const CATALOG = ['mostlikely', 'tableread', 'impostor', 'spy', 'charades', 'bomb', 'mafia', 'whowrote', 'alias', 'truthdare'];

describe('მთავარი ეკრანი — „პოპულარული“ რიგი', () => {
  it('ცარიელ ჟურნალზე რედაქტორული რიგია', () => {
    expect(popularIDs({}, CATALOG)).toEqual([...DEFAULT_POPULAR]);
  });

  it('ნათამაშები წინ გადადის სიხშირით, დანარჩენს რედაქტორული რიგი ავსებს', () => {
    const out = popularIDs({ mafia: 3, alias: 5, charades: 1 }, CATALOG);
    expect(out.slice(0, 3)).toEqual(['alias', 'mafia', 'charades']);
    expect(out).toHaveLength(6);
    expect(new Set(out).size).toBe(6);
    expect(out.slice(3)).toEqual(['mostlikely', 'impostor', 'truthdare']);
  });

  it('კატალოგიდან წაშლილი თამაში რიგში ვერ ხვდება', () => {
    const out = popularIDs({ ghost: 9 }, CATALOG);
    expect(out).not.toContain('ghost');
    expect(out).toHaveLength(6);
  });

  it('ლიმიტი კატალოგზე დიდი რომ იყოს, კატალოგის რიგით ივსება და არ მეორდება', () => {
    const out = popularIDs({}, CATALOG, 20);
    expect(out).toHaveLength(CATALOG.length);
    expect(new Set(out).size).toBe(CATALOG.length);
  });
});
