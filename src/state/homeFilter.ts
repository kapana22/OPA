import { familyTitle, type GameFamily, type PartyGame } from '../games/types';

/**
 * მთავარი ეკრანის ფილტრი.
 *
 * პორტი: `HomeFilter` (`Splash/App/HomeView.swift`).
 * „ჩვენს კომპანიას“ მხოლოდ მაშინ ჩნდება, როცა სიაში ვინმეა — თორემ უაზროა.
 */
export type HomeFilter =
  | { kind: 'all' }
  | { kind: 'family'; family: GameFamily }
  | { kind: 'fits' }
  | { kind: 'quick' }
  | { kind: 'calm' };

export const QUICK_LIMIT = 12;

export const ALL_FILTER: HomeFilter = { kind: 'all' };

export function filterKey(f: HomeFilter): string {
  return f.kind === 'family' ? `family:${f.family}` : f.kind;
}

export function filterTitle(f: HomeFilter): string {
  switch (f.kind) {
    case 'all':
      return 'ყველა';
    case 'family':
      return familyTitle[f.family];
    case 'fits':
      return 'ჩვენს კომპანიას';
    case 'quick':
      return '10-15 წუთი';
    case 'calm':
      return 'ჩუმი';
  }
}

export function accepts(f: HomeFilter, game: PartyGame, playerCount: number): boolean {
  switch (f.kind) {
    case 'all':
      return true;
    case 'family':
      return game.family === f.family;
    case 'fits':
      return !game.comingSoon && playerCount >= game.minPlayers && playerCount <= game.maxPlayers;
    case 'quick':
      return game.minutes <= QUICK_LIMIT;
    case 'calm':
      return game.energy === 'calm';
  }
}

const FAMILIES: GameFamily[] = ['bluff', 'loud', 'reading', 'candid'];

export function visibleFilters(playerCount: number): HomeFilter[] {
  const options: HomeFilter[] = [{ kind: 'all' }];
  if (playerCount > 0) options.push({ kind: 'fits' });
  options.push({ kind: 'quick' }, { kind: 'calm' });
  for (const family of FAMILIES) options.push({ kind: 'family', family });
  return options;
}

/** ახალი თამაშები წინ, დანარჩენები კატალოგის რიგით. */
export function newestFirst(games: PartyGame[]): PartyGame[] {
  return games
    .map((game, offset) => ({ game, offset }))
    .sort((a, b) => (a.game.isNew === b.game.isNew ? a.offset - b.offset : a.game.isNew ? -1 : 1))
    .map((x) => x.game);
}
