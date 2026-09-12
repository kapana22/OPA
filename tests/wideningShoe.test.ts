import { describe, it, expect, beforeEach } from 'vitest';
import { WideningShoe } from '../src/core/wideningShoe';
import { ContentShoe } from '../src/core/contentShoe';
import { __resetForTests } from '../src/core/storage';

const small = ['ხაჭაპური', 'ხინკალი', 'ლობიო'];
const bank = [...small, ...Array.from({ length: 12 }, (_, i) => `სხვა-${i + 1}`)];

beforeEach(() => __resetForTests());

describe('WideningShoe — კატეგორია ამოიწურა → ბანკიდან, არა თავიდან', () => {
  it('ჯერ კატეგორია მთლიანად, მერე მხოლოდ სხვა კატეგორიების სიტყვები', () => {
    const shoe = new WideningShoe('word.food', small, 'word.all', bank);
    const first = [shoe.draw(), shoe.draw(), shoe.draw()];
    expect(new Set(first)).toEqual(new Set(small));
    expect(shoe.widened).toBe(false);

    const next = Array.from({ length: 6 }, () => shoe.draw()!);
    expect(next.every((w) => !small.includes(w))).toBe(true);
    expect(new Set(next).size).toBe(6);
    expect(shoe.widened).toBe(true);
  });

  it('კატეგორიის გარეშე (გასაღები ერთია) გაფართოება არ ხდება — ჩვეულებრივი წრეა', () => {
    const shoe = new WideningShoe('word.all', bank, 'word.all', bank);
    const draws = Array.from({ length: bank.length + 2 }, () => shoe.draw()!);
    expect(new Set(draws.slice(0, bank.length)).size).toBe(bank.length);
    expect(shoe.widened).toBe(false);
  });

  it('ბანკის დასტა ერთსა და იმავე გასაღებს იზიარებს — შარადებში ნანახი აქაც ითვლება', () => {
    const shoe = new WideningShoe('word.food', small, 'word.all', bank);
    for (let i = 0; i < 4; i++) shoe.draw();
    expect(ContentShoe.remaining('word.all', bank)).toBe(bank.length - 1);
  });

  it('შეზღუდვის ფილტრი ბანკის დასტაზეც მოქმედებს', () => {
    const shoe = new WideningShoe('word.food', small, 'word.all', bank);
    for (let i = 0; i < 3; i++) shoe.draw();
    const w = shoe.draw((x) => x !== 'სხვა-7');
    expect(w).toBe('სხვა-7');
  });
});

describe('ContentShoe.remaining — შენახულის მიხედვით, დასტის შეუცვლელად', () => {
  it('ცარიელ მეხსიერებაზე მთელი ბანკია; დარიგების მერე კლებულობს; წაშლილი არ ითვლება', () => {
    expect(ContentShoe.remaining('t.r', bank)).toBe(bank.length);
    const shoe = new ContentShoe('t.r', bank);
    shoe.drawMany(5);
    expect(ContentShoe.remaining('t.r', bank)).toBe(bank.length - 5);
    // ბანკი შემცირდა — მაინც არ ჩავარდება და უარყოფითიც არ იქნება.
    expect(ContentShoe.remaining('t.r', small)).toBeGreaterThanOrEqual(0);
    // კითხვამ არაფერი შეცვალა.
    expect(shoe.freshCount).toBe(bank.length - 5);
  });
});
