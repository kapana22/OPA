export type PlayerGender = 'boy' | 'girl';

/** Stable IDs shared by storage and the twelve bundled player characters. */
export const CHARACTER_COUNT = 12;

export const BOY_CHARACTERS = [0, 2, 4, 6, 8, 10, 11];
export const GIRL_CHARACTERS = [1, 3, 5, 7, 9];

export const isCharacterID = (id: unknown): id is number =>
  typeof id === 'number' && Number.isInteger(id) && id >= 0 && id < CHARACTER_COUNT;

export const characterGender = (id: number): PlayerGender =>
  GIRL_CHARACTERS.includes(id) ? 'girl' : 'boy';

const COMMON_GIRL_NAMES = new Set([
  'მარი', 'მარიამ', 'მარიამი', 'ნია', 'ანი', 'ანო', 'თაკო', 'თამარ', 'თამარი',
  'ნინო', 'სალომე', 'ქეთი', 'ლიკა', 'ლილე', 'ელენე', 'სოფო', 'თინა', 'თინათინ',
  'ნატა', 'ნატალი', 'ანა', 'ანასტასია', 'მეგი', 'მაკა', 'მზია', 'ქეთევან', 'დია',
  'ლიზი', 'ნუცა', 'ქეთა', 'ბარბარე', 'მარეხი', 'ცირა', 'დეა', 'თეკლა', 'თათია',
  'ნატალია', 'ლელა', 'მაია', 'ნათია', 'ხატია', 'მირანდა', 'თეონა', 'რუსკა', 'ნანკა'
]);

export function guessGender(name: string): PlayerGender {
  const clean = name.trim().toLowerCase();
  if (COMMON_GIRL_NAMES.has(clean)) return 'girl';
  return 'boy';
}

export function availableCharacter(used: Set<number>, gender?: PlayerGender): number {
  const pool = gender === 'girl' ? GIRL_CHARACTERS : gender === 'boy' ? BOY_CHARACTERS : Array.from({ length: CHARACTER_COUNT }, (_, id) => id);
  const free = pool.filter(id => !used.has(id));
  if (free.length > 0) {
    return free[Math.floor(Math.random() * free.length)];
  }
  const anyFree = Array.from({ length: CHARACTER_COUNT }, (_, id) => id).filter(id => !used.has(id));
  return anyFree[0] ?? pool[Math.floor(Math.random() * pool.length)] ?? 0;
}