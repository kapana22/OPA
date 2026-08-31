import data from './catalog.data.json';
import type { PartyGame } from './types';

/**
 * თამაშების რეგისტრი.
 *
 * პორტი: `Splash/Core/GameCatalog.swift`. ტექსტი (სათაური, ტეგლაინი, წესები,
 * ალიასები) **Swift-იდან სკრიპტით არის ამოღებული და არა ხელით გადაწერილი** —
 * 177 სტრიქონი, ერთი-ერთზე გადამოწმებული. `catalog.data.json`-ია წყარო.
 */
export const GameCatalog: PartyGame[] = data as PartyGame[];

export function game(id: string): PartyGame | undefined {
  return GameCatalog.find((g) => g.id === id);
}

/**
 * ძებნის ტექსტი — სახელი, ტეგლაინი და წესები ერთად, რომ „ღამე“-ზეც მოიძებნოს მაფია.
 *
 * ერთხელ იგება და ინახება: ყოველ აკრეფილ ასოზე ცხრამეტივე თამაშის ტექსტის
 * თავიდან წებება და პატარა ასოებზე გადაყვანა ძებნას შესამჩნევად ანელებდა.
 */
const haystacks: Record<string, string> = Object.fromEntries(
  GameCatalog.map((g) => [g.id, [g.title, g.tagline, ...g.howTo, ...g.aliases].join(' ').toLowerCase()]),
);

/**
 * მოთხოვნა ერთხელ იშლება სიტყვებად და მერე ყველა თამაშს ერთი და იგივე მიეწოდება —
 * თორემ ყოველ აკრეფილ ასოზე ცხრამეტჯერ მეორდებოდა.
 */
export function needles(query: string): string[] {
  return query.toLowerCase().split(' ').filter(Boolean);
}

/** ყველა შეყვანილი სიტყვა უნდა დაემთხვეს — ორსიტყვიანი ძებნაც რომ მუშაობდეს. */
export function matches(g: PartyGame, queryNeedles: string[]): boolean {
  if (queryNeedles.length === 0) return true;
  const haystack = haystacks[g.id] ?? g.title.toLowerCase();
  return queryNeedles.every((n) => haystack.includes(n));
}

/** ბოლოს ნათამაშების იდენტიფიკატორები → თამაშები (Swift: `RecentGames+Catalog`). */
export function gamesByIDs(ids: readonly string[]): PartyGame[] {
  return ids.map((id) => game(id)).filter((g): g is PartyGame => g !== undefined);
}
