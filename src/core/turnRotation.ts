/**
 * წრეზე მბრუნავი ჯერის სამართლიანი დაგეგმვა.
 *
 * **რა პრობლემას წყვეტს.** როლი `players[index % count]`-ით ირჩევა, რაუნდების
 * რაოდენობა კი ფიქსირებული იყო: 3 / 5 / 8. ექვსკაციან კომპანიაში „3 რაუნდი“
 * ნიშნავდა, რომ **სამ ადამიანს ჯერი საერთოდ არ ხვდებოდა.** შემოწმებამ 137
 * ასეთი უსამართლო კომბინაცია იპოვა.
 *
 * **გადაწყვეტა.** რაუნდი ითვლება **წრეებით**: „ყველა ერთხელ“, „ყველა ორჯერ“,
 * „ყველა სამჯერ“. წრე ყოველთვის მთელია, ამიტომ ჯერების რაოდენობა ყველასთვის
 * ზუსტად ერთნაირია.
 *
 * პორტი: `Splash/Core/TurnRotation.swift`.
 */
export const TurnRotation = {
  /** რამდენი წრის არჩევა შეიძლება. */
  lapOptions: [1, 2, 3] as const,

  /** წრეები → რაუნდები. */
  rounds(laps: number, players: number): number {
    return Math.max(1, laps) * Math.max(1, players);
  },

  /** ღილაკის წარწერა. */
  label(laps: number): string {
    switch (laps) {
      case 1:
        return 'ყველა ერთხელ';
      case 2:
        return 'ყველა ორჯერ';
      case 3:
        return 'ყველა სამჯერ';
      default:
        return `ყველა ${laps}-ჯერ`;
    }
  },

  /** მოკლე წარწერა, სადაც ადგილი ცოტაა. */
  shortLabel(laps: number, players: number): string {
    return `${laps}× — ${TurnRotation.rounds(laps, players)} რაუნდი`;
  },

  /**
   * ძველი, ცალობითი პარამეტრის გადაყვანა წრეებში — რომ განახლების შემდეგ
   * მოთამაშის შენახული „8 რაუნდი“ ნაცნობ სახეს ინარჩუნებდეს.
   */
  lapsFromLegacy(rounds: number, players: number): number {
    if (rounds <= 0 || players <= 0) return 1;
    // Swift-ის `.rounded()` — ნახევარი მოშორებით ნულისგან.
    const raw = rounds / players;
    const rounded = Math.sign(raw) * Math.round(Math.abs(raw));
    return Math.min(Math.max(1, rounded), TurnRotation.lapOptions[TurnRotation.lapOptions.length - 1]);
  },
};
