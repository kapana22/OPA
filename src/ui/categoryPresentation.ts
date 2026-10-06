/** კონტენტის სახელები უცვლელია; UI-ში წამყვანი ემოჯი ერთიანი ვექტორით იცვლება. */
export function categoryPresentation(label: string): { title: string; icon?: string } {
  const prefix = label.match(/^\s*(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[\uFE0F\u200D])+\s*/u);
  if (!prefix) return { title: label };
  const title = label.slice(prefix[0].length).trim();
  const groups: [RegExp, string][] = [
    [/საკვები|სუფრა|ხილი|კერძ|სამზარეულო|სასმელ/, 'category.food'],
    [/ცხოველ/, 'category.animals'],
    [/ბუნება|საქართველო|ამინდ|სეზონ|ზღვა|მდინარ/, 'category.nature'],
    [/მსოფლიო|ქვეყნები|ქართული|ქართულად/, 'category.world'],
    [/ქალაქი|ადგილები|ყოფა/, 'category.city'],
    [/ფილმ|სიტუაცი/, 'category.movies'],
    [/სპორტ|ქმედებ|მოძრაობ/, 'category.sport'],
    [/ხელოვნება|გემოვნებ|ტრადიცი/, 'category.art'],
    [/მუსიკ|ხმები/, 'category.music'],
    [/ტრანსპორტ|მოგზაურ/, 'category.travel'],
    [/მეგობრ|ოჯახი|ნათესავ|ადამიანებ/, 'person.3.fill'],
    [/ცნობილ|ნიჭი/, 'star.fill'],
    [/პროფესი|სამსახურ|სწავლა|სკოლა/, 'book.closed.fill'],
    [/ტექნ|ინტერნეტ|აპები/, 'iphone.gen3'],
    [/პაემან|წყვილ/, 'heart.fill'],
    [/აბსურდ|მითები|კოსმოს|უცნაურ/, 'burst.fill'],
    [/ემოცი|სახე|ყოველდღ|ჩვევ/, 'face.smiling'],
    [/დღესასწაულ|ზეიმ/, 'party.popper.fill'],
    [/ჯანმრთელ/, 'cross.case.fill'],
    [/ხელსაწყო/, 'wrench.and.screwdriver.fill'],
    [/სიტყვები|გულახდილ/, 'bubble.left.and.bubble.right.fill'],
  ];
  return { title, icon: groups.find(([pattern]) => pattern.test(title))?.[1] ?? 'rectangle.stack.fill' };
}
