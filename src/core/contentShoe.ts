import { shuffled } from './shuffle';
import { getJSON, setJSON, remove, removeByPrefix } from './storage';

/**
 * კონტენტის დამრიგებელი, რომელსაც სესიებს შორისაც ახსოვს, სად გაჩერდა.
 *
 * პორტი: `Splash/Core/ContentShoe.swift` — ლოგიკა ერთი-ერთზეა, `UserDefaults`
 * შეცვლილია `storage`-ით (სინქრონული ფასადი, იხ. `storage.ts`).
 *
 * **რა პრობლემას წყვეტს.** `pool.randomElement()` ოთხკაციან კომპანიაში მესამე
 * რაუნდზევე იმეორებს სიტყვას. ერთხელ არეული მასივიც არ კმარა — თამაშიდან
 * გამოსვლა-შესვლა დასტას ნულიდან ურევდა.
 *
 * **როგორ მუშაობს.** დასტა ერთხელ ირევა, მთელი რიგი კურსორთან ერთად ინახება.
 * ჩანაწერი მეორედ მხოლოდ მაშინ მოვა, როცა კატეგორია ამოიწურება — არევისას კი
 * ბოლოს ნანახები კუდში გადადიან, რომ ორ წრეს შორის ზღვარზე იგივე არ დადგეს.
 *
 * **გასაღები კონტენტისაა, არა თამაშისა.** ალიასი და შარადები ერთსა და იმავე
 * ბანკს იყენებენ — ერთი გასაღები ნიშნავს, რომ ალიასში ნანახი სიტყვა შარადებში
 * მაშინვე არ დაბრუნდება.
 */
export class ContentShoe {
  /**
   * რამდენ ბოლო ჩანაწერს გადავიტანთ არევისას რიგის ბოლოში.
   * პულის მეოთხედია, ოღონდ არასდროს მთელი ბანკი — თუ კუდში ყველაფერი მოხვდა,
   * ასარევი აღარაფერი რჩება და ზედიზედ გამეორება გარდაუვალი ხდება.
   */
  private static tailKeep(poolSize: number): number {
    if (poolSize <= 1) return 0;
    return Math.min(Math.max(6, Math.floor(poolSize / 4)), 40, poolSize - 1);
  }

  /** რამდენ პოზიციაზე ვიხედებით წინ, როცა ჩანაწერი ფილტრმა უარყო. */
  private static readonly lookahead = 30;

  private readonly key: string;
  private readonly pool: string[];
  /** მთელი წრის რიგი — არეული ერთხელ, შემდეგ უცვლელი წრის ბოლომდე. */
  private order: string[];
  /** კურსორი: `order[index]` შემდეგი დასარიგებელია. */
  private index: number;

  /**
   * @param key კონტენტის იდენტიფიკატორი, არა თამაშისა (მაგ. `"word.ge_food"`).
   * @param pool მიმდინარე ბანკის სრული შიგთავსი ამ კატეგორიისთვის.
   */
  constructor(key: string, pool: readonly string[]) {
    this.key = key;
    // დუბლიკატი დასტას წყვეტს — ერთი და იგივე სიტყვა ორ კატეგორიაშიც გვხვდება.
    const seen = new Set<string>();
    this.pool = pool.filter((x) => (seen.has(x) ? false : (seen.add(x), true)));

    const stored = ContentShoe.load(key);
    const known = new Set(this.pool);

    // შენახული რიგიდან ვტოვებთ მხოლოდ იმას, რაც ბანკში ისევ არსებობს —
    // აპის განახლებამ შეიძლება ჩანაწერი წაშალოს ან გადაარქვას.
    // კურსორი იმდენით უკან ინაცვლებს, რამდენი წაშლილიც მის წინ იდგა.
    let rebuilt: string[] = [];
    let cursor = 0;
    stored.order.forEach((item, position) => {
      if (!known.has(item)) return;
      rebuilt.push(item);
      if (position < stored.index) cursor += 1;
    });

    // ბანკს ახალი ჩანაწერები დაემატა? ვურევთ **დაურიგებელ** ნაწილში,
    // რომ განახლების შემდეგ პირველივე საღამოზე გამოჩნდნენ.
    const accounted = new Set(rebuilt);
    const additions = this.pool.filter((x) => !accounted.has(x));
    if (additions.length > 0) {
      const pending = shuffled([...rebuilt.slice(cursor), ...additions]);
      rebuilt = [...rebuilt.slice(0, cursor), ...pending];
    }

    this.order = rebuilt;
    this.index = Math.min(cursor, rebuilt.length);
    if (this.order.length === 0 || this.index >= this.order.length) this.reshuffle();
  }

  // MARK: - რიგი

  /** ბოლოს დარიგებული ჩანაწერები — ახლიდან ძველისკენ. */
  get recent(): string[] {
    return this.order.slice(0, this.index).reverse();
  }

  /** კიდევ რამდენი ჩანაწერია გამეორებამდე. */
  get freshCount(): number {
    return Math.max(0, this.order.length - this.index);
  }

  // MARK: - დარიგება

  /**
   * შემდეგი ჩანაწერი, სურვილისამებრ ფილტრით.
   *
   * უარყოფილი ჩანაწერი რიგიდან **არ იშლება** — უბრალოდ ახლა გვერდს ვუვლით და
   * მოგვიანებით მოვა. ასე ჯაშუშის წყვილი, რომლის სიტყვაც ახლახან იყო,
   * გადაიდება და არ დაიკარგება.
   */
  draw(shouldSkip: (item: string) => boolean = () => false): string | null {
    if (this.pool.length === 0) return null;
    if (this.index >= this.order.length) this.reshuffle();
    if (this.index >= this.order.length) return null;

    const horizon = Math.min(this.order.length - this.index, ContentShoe.lookahead);
    let offset = 0;
    for (let i = 0; i < horizon; i++) {
      if (!shouldSkip(this.order[this.index + i])) {
        offset = i;
        break;
      }
    }

    // მონახული ჩანაწერი კურსორის ადგილას გადმოგვაქვს — რიგის დანარჩენი
    // თანმიმდევრობა ხელუხლებელი რჩება.
    if (offset > 0) {
      const [item] = this.order.splice(this.index + offset, 1);
      this.order.splice(this.index, 0, item);
    }

    const item = this.order[this.index];
    this.index += 1;
    this.save();
    return item;
  }

  /** რამდენიმე ჩანაწერი ერთად — ერთმანეთს ვერასდროს გაიმეორებენ. */
  drawMany(count: number): string[] {
    const out: string[] = [];
    for (let i = 0; i < Math.max(0, count); i++) {
      const item = this.draw();
      if (item !== null) out.push(item);
    }
    return out;
  }

  // MARK: - შიდა

  /** წრე დასრულდა — თავიდან ვურევთ, ბოლოს ნანახები კი რიგის ბოლოში მიდიან. */
  private reshuffle(): void {
    if (this.pool.length === 0) {
      this.order = [];
      this.index = 0;
      return;
    }
    const keep = ContentShoe.tailKeep(this.pool.length);
    const tail = keep > 0 ? this.order.slice(-keep) : [];
    const tailSet = new Set(tail);
    const head = shuffled(this.pool.filter((x) => !tailSet.has(x)));
    this.order = head.length === 0 ? shuffled(this.pool) : [...head, ...shuffled(tail)];
    this.index = 0;
  }

  // MARK: - შენახვა

  private static storageKey(key: string): string {
    return `splash.shoe.${key}.v2`;
  }

  private static load(key: string): { order: string[]; index: number } {
    const snap = getJSON<{ order?: unknown; index?: unknown }>(ContentShoe.storageKey(key), {});
    const order = Array.isArray(snap.order) ? snap.order.filter((x): x is string => typeof x === 'string') : [];
    const index = typeof snap.index === 'number' && Number.isFinite(snap.index) ? snap.index : 0;
    return { order, index };
  }

  private save(): void {
    setJSON(ContentShoe.storageKey(this.key), { order: this.order, index: this.index });
  }

  /**
   * კიდევ რამდენი **ახალი** ჩანაწერია ამ დასტაში — შენახულის მიხედვით, დასტის
   * აშენების გარეშე. კატეგორიის ჩიპს „დარჩა 8“ სჭირდება ისე, რომ თხუთმეტი
   * დასტა რენდერზე არ აიგოს და არაფერი არ შეიცვალოს.
   *
   * წაშლილი ჩანაწერები არ ითვლება; ბანკს დამატებული და ჯერ არნახული — ითვლება.
   * შენახული არაფერია → მთელი ბანკი ახალია.
   */
  static remaining(key: string, pool: readonly string[]): number {
    const known = new Set(pool);
    const stored = ContentShoe.load(key);
    if (stored.order.length === 0) return known.size;
    const seen = new Set<string>();
    stored.order.slice(0, stored.index).forEach((x) => {
      if (known.has(x)) seen.add(x);
    });
    return Math.max(0, known.size - seen.size);
  }

  /** კონკრეტული დასტის მეხსიერების გასუფთავება. */
  static forget(key: string): void {
    remove(ContentShoe.storageKey(key));
  }

  /** ყველა დასტის მეხსიერების გასუფთავება — პარამეტრებში „კონტენტის განულება“. */
  static forgetAll(): void {
    removeByPrefix('splash.shoe.');
  }
}
