/**
 * „პოპულარული“ რიგი მთავარ ეკრანზე.
 *
 * **რატომ.** კომპანია ცხრამეტ თამაშს არ თამაშობს — სამ-ოთხს თამაშობს. პირველი
 * რიგი სწორედ ის უნდა იყოს, რაც ამ ტელეფონზე ყველაზე ხშირად იხსნება; სანამ
 * საღამოს ჟურნალი ცარიელია, რიგს რედაქტორული რიგი ავსებს — ის ექვსი, რომელსაც
 * ახალი კომპანია ყველაზე ხშირად ირჩევს.
 */
export const DEFAULT_POPULAR: readonly string[] = ['charades', 'mostlikely', 'impostor', 'truthdare', 'spy', 'bomb'];

export const POPULAR_LIMIT = 6;

/**
 * @param plays რამდენჯერ გაიხსნა თითოეული თამაში (`NightLog.plays`).
 * @param available კატალოგის იდენტიფიკატორები, კატალოგის რიგით — წაშლილი თამაში რიგში ვერ მოხვდება.
 */
export function popularIDs(
  plays: Readonly<Record<string, number>>,
  available: readonly string[],
  limit = POPULAR_LIMIT,
): string[] {
  const known = new Set(available);
  const defaultRank = (id: string) => {
    const i = DEFAULT_POPULAR.indexOf(id);
    return i === -1 ? DEFAULT_POPULAR.length : i;
  };

  // ჯერ ის, რაც მართლა ითამაშეს — სიხშირით; თანაბარზე რედაქტორული რიგი წყვეტს.
  const played = Object.entries(plays)
    .filter(([id, n]) => known.has(id) && n > 0)
    .sort((a, b) => (a[1] !== b[1] ? b[1] - a[1] : defaultRank(a[0]) - defaultRank(b[0])))
    .map(([id]) => id);

  const out: string[] = [];
  const push = (id: string) => {
    if (out.length < limit && known.has(id) && !out.includes(id)) out.push(id);
  };
  played.forEach(push);
  DEFAULT_POPULAR.forEach(push);
  available.forEach(push);
  return out;
}
