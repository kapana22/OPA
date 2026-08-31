import { describe, it, expect, beforeEach } from 'vitest';
import { ContentShoe } from '../src/core/contentShoe';
import { __resetForTests } from '../src/core/storage';

/**
 * პორტი: `Tools/tests/shoe/main.swift`.
 *
 * `storage` აქ სუფთა მეხსიერებაა — ნატიური მოდული არ შემოდის, ამიტომ ეს
 * ტესტები ტელეფონის და ემულატორის გარეშე გადის.
 */

const pool20 = Array.from({ length: 20 }, (_, i) => `სიტყვა-${i + 1}`);

beforeEach(() => __resetForTests());

describe('ContentShoe', () => {
  it('1. სამი პარტია ზედიზედ — 18 გათამაშება 20-სიტყვიან ბანკზე, გამეორების გარეშე', () => {
    const draws: string[] = [];
    for (let party = 0; party < 3; party++) {
      const shoe = new ContentShoe('t.small', pool20);
      for (let i = 0; i < 6; i++) draws.push(shoe.draw()!);
    }
    expect(new Set(draws).size).toBe(draws.length);
  });

  it('2. სრული წრე ფარავს ბანკს და არევის შემდეგ ბოლო 5 მაშინვე არ ბრუნდება', () => {
    const shoe = new ContentShoe('t.cycle', pool20);
    const first = Array.from({ length: 20 }, () => shoe.draw()!);
    expect(new Set(first).size).toBe(20);

    const nextFive = Array.from({ length: 5 }, () => shoe.draw()!);
    const lastFive = new Set(first.slice(-5));
    expect(nextFive.every((x) => !lastFive.has(x))).toBe(true);
  });

  it('3. მსგავსების ფილტრი — ზედიზედ წყვილებს საერთო სიტყვა არ აქვთ', () => {
    const pairs = ['ყავა|ჩაი', 'ყავა|კაკაო', 'ზღვა|ტბა', 'მთა|ბორცვი', 'ზამთარი|შემოდგომა', 'პური|ნამცხვარი'];
    const shoe = new ContentShoe('t.pairs', pairs);
    const used: string[] = [];
    for (let i = 0; i < 4; i++) {
      const recent = new Set(shoe.recent.slice(0, 6).flatMap((p) => p.split('|')));
      used.push(shoe.draw((id) => id.split('|').some((w) => recent.has(w)))!);
    }
    const words = used.flatMap((p) => p.split('|'));
    expect(new Set(words).size).toBe(words.length);
  });

  it('4. ბანკის განახლების შემდეგ ახალი ჩანაწერები მალევე ჩნდება', () => {
    const a = new ContentShoe('t.grow', pool20);
    for (let i = 0; i < 18; i++) a.draw();

    const b = new ContentShoe('t.grow', [...pool20, 'ახალი-A', 'ახალი-B']);
    const after = Array.from({ length: 4 }, () => b.draw()!);
    expect(after).toContain('ახალი-A');
    expect(after).toContain('ახალი-B');
  });

  it('5. წაშლილი სიტყვები აღარ ბრუნდება', () => {
    const a = new ContentShoe('t.shrink', pool20);
    for (let i = 0; i < 5; i++) a.draw();

    const small = pool20.slice(0, 10);
    const b = new ContentShoe('t.shrink', small);
    const shrunk = Array.from({ length: 10 }, () => b.draw()!);
    expect(shrunk.every((x) => small.includes(x))).toBe(true);
  });

  it.each([2, 3, 5, 8])('6. %i-ერთეულიან ბანკზე ზედიზედ გამეორება არ არის და ყველა გამოიყენება', (size) => {
    __resetForTests();
    const shoe = new ContentShoe(`t.tiny${size}`, Array.from({ length: size }, (_, i) => `მ${i + 1}`));
    const tiny = Array.from({ length: 40 }, () => shoe.draw()!);

    let maxRun = 1;
    let run = 1;
    for (let i = 1; i < tiny.length; i++) {
      if (tiny[i] === tiny[i - 1]) maxRun = Math.max(maxRun, ++run);
      else run = 1;
    }
    expect(maxRun).toBe(1);
    expect(new Set(tiny).size).toBe(size);
  });

  it('7. ერთეულოვანი და ცარიელი ბანკი არ ვარდება', () => {
    const one = new ContentShoe('t.one', ['ერთი']);
    expect(Array.from({ length: 5 }, () => one.draw())).toEqual(Array(5).fill('ერთი'));

    const none = new ContentShoe('t.none', []);
    expect(none.draw()).toBeNull();
  });

  it('8. რეალური სცენარი — 5 საღამო, თითო 8 რაუნდი', () => {
    const nights: string[][] = [];
    for (let n = 0; n < 5; n++) {
      const shoe = new ContentShoe('t.night', pool20);
      nights.push(Array.from({ length: 8 }, () => shoe.draw()!));
    }
    // არც ერთ საღამოში სიტყვა არ მეორდება
    expect(nights.filter((n) => new Set(n).size !== n.length)).toHaveLength(0);
    // მეორე საღამო პირველს **საერთოდ** არ იმეორებს (Swift: intersection.isEmpty)
    const night1 = new Set(nights[0]);
    expect(nights[1].filter((x) => night1.has(x))).toEqual([]);
  });
});
