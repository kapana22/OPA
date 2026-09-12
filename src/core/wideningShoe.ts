import { ContentShoe } from './contentShoe';

/**
 * დასტა, რომელიც ამოწურვისას **ფართოვდება** და არა თავიდან ირევა.
 *
 * **რა პრობლემას წყვეტს.** „🍕 საკვები“ 40 სიტყვაა; ექვსკაციანი კომპანია მას
 * ერთ საღამოში ამოწურავს და მეორე წრეზე იგივე სიტყვები ბრუნდება — ყველა
 * კონკურენტის ერთვარსკვლავიანი მიმოხილვების პირველი მიზეზი. ამის ნაცვლად,
 * როცა კატეგორიაში ახალი აღარაფერია, სიტყვა მთელი ბანკის დასტიდან მოდის
 * (`word.all` / `word.charades-all`), ისიც ისე, რომ ამ კატეგორიის სიტყვები
 * გამოტოვოს — ანუ მართლა უნახავი მოვიდეს.
 *
 * კატეგორია რომ არ არის არჩეული, ძირითადი დასტა თვითონაა ბანკის დასტა და
 * გაფართოება არ სჭირდება — მაშინ ჩვეულებრივად ირევა.
 *
 * ბანკის დასტა ზარმაცად იგება — მხოლოდ მაშინ, როცა პირველად დასჭირდა.
 */
export class WideningShoe {
  private readonly primary: ContentShoe;
  private readonly primaryPool: Set<string>;
  private readonly wideKey: string;
  private readonly widePool: readonly string[];
  private wide: ContentShoe | null = null;
  private readonly canWiden: boolean;
  /** ბოლო სიტყვა ბანკის დასტიდან მოვიდა — ეკრანს შეუძლია ჩუმად აღნიშნოს. */
  private _widened = false;

  constructor(key: string, pool: readonly string[], wideKey: string, widePool: readonly string[]) {
    this.primary = new ContentShoe(key, pool);
    this.primaryPool = new Set(pool);
    this.wideKey = wideKey;
    this.widePool = widePool;
    this.canWiden = key !== wideKey && widePool.some((w) => !this.primaryPool.has(w));
  }

  /** კიდევ რამდენია კატეგორიაში გამეორებამდე. */
  get freshCount(): number {
    return this.primary.freshCount;
  }
  get widened(): boolean {
    return this._widened;
  }
  get recent(): string[] {
    return this.primary.recent;
  }

  draw(shouldSkip: (item: string) => boolean = () => false): string | null {
    if (!this.canWiden || this.primary.freshCount > 0) {
      this._widened = false;
      return this.primary.draw(shouldSkip);
    }
    this.wide ??= new ContentShoe(this.wideKey, this.widePool);
    // ბანკის დასტიდანაც მხოლოდ ის, რაც ამ კატეგორიაში არ იყო — თორემ იგივე
    // სიტყვა სხვა კარიდან შემოვიდოდა.
    const item = this.wide.draw((w) => this.primaryPool.has(w) || shouldSkip(w));
    if (item !== null) {
      this._widened = true;
      return item;
    }
    this._widened = false;
    return this.primary.draw(shouldSkip);
  }
}
