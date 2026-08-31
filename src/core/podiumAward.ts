import type { Player } from './roster';
import type { Roster } from './roster';

export interface PodiumResult {
  player: Player;
  score: number;
}
export interface PodiumAwardEntry {
  player: Player;
  points: number;
}

/**
 * საერთო ტაბლოზე ქულის დარიცხვა თამაშის ბოლოს.
 *
 * **რას ასწორებს.** ადრე ყველა თამაში `ranking`-ს იყენებდა, რომელიც ფრეს
 * **ანბანით** არღვევდა. ოთხმა ერთნაირი ქულა რომ დააგროვა, გიორგი +3-ს იღებდა,
 * ნინო კი 0-ს — უბრალოდ იმიტომ, რომ „გ“ „ნ“-ზე ადრეა.
 *
 * **ახალი წესი.** ერთნაირი შედეგი — ერთნაირი ჯილდო. ადგილები სპორტული წესით:
 * თუ პირველ ადგილს ორი იყოფს, შემდეგი მესამეა და არა მეორე.
 *
 * ნულოვანი შედეგი პოდიუმზე არ ადის.
 *
 * პორტი: `Splash/Core/PodiumAward.swift`.
 */
export const PodiumAward = {
  points: [3, 2, 1] as const,

  /** ერთი თამაშის შედეგების საერთო ტაბლოში გადატანა. */
  apply(results: PodiumResult[], roster: Roster, minimum = 1): void {
    for (const { player, points } of PodiumAward.distribute(results, minimum)) {
      roster.addScore(points, player.id);
    }
  },

  /** იგივე გამოთვლა დარიცხვის გარეშე — შეჯამების ეკრანს რომ შეეძლოს ჩვენება. */
  distribute(results: PodiumResult[], minimum = 1): PodiumAwardEntry[] {
    const qualified = results.filter((r) => r.score >= minimum);
    if (qualified.length === 0) return [];

    // ერთნაირი შედეგები ერთ საფეხურად იკრიბება.
    const tiers = new Map<number, Player[]>();
    for (const r of qualified) {
      const group = tiers.get(r.score);
      if (group) group.push(r.player);
      else tiers.set(r.score, [r.player]);
    }

    const awards: PodiumAwardEntry[] = [];
    let place = 0;
    for (const score of [...tiers.keys()].sort((a, b) => b - a)) {
      if (place >= PodiumAward.points.length) break;
      const reward = PodiumAward.points[place];
      const group = tiers.get(score)!;
      for (const player of group) awards.push({ player, points: reward });
      // სპორტული წესი: ორი პირველის შემდეგ მესამე ადგილი მოდის, არა მეორე.
      place += group.length;
    }
    return awards;
  },
};
