import { Colors } from './theme';

/**
 * წვეულების მოთამაშეთა უნიკალური პალიტრა.
 * პორტი: `Splash/Theme/PlayerPalette.swift`.
 * OPA-ს ოფიციალური პალიტრის 12 ჰარმონიული ტონი.
 */
export const PlayerPaletteColors: string[] = [
  Colors.phosphor,                       // 1. Phosphor Lime (#C6FF00)
  Colors.violet,                         // 2. Deep Purple / Violet
  Colors.softLavender,                   // 3. Soft Lavender (#CBB8F6)
  Colors.warmCream,                      // 4. Warm Cream (#FAF5E8)
  '#7C3AED',                             // 5. Vibrant Violet
  '#DDD6FE',                             // 6. Light Lavender
  '#D4FF33',                             // 7. Bright Phosphor
  '#4A1582',                             // 8. 3D Depth Purple
  '#EDE9FE',                             // 9. Soft Lavender Tint
  '#FFFBEB',                             // 10. Warm Cream Bright
  '#9333EA',                             // 11. Purple Accent
  '#B5E600',                             // 12. Phosphor Lime Deep
];

export function stainSeed(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  }
  return Math.abs(hash >>> 0);
}

export function getPlayerColor(indexOrName: number | string): string {
  if (typeof indexOrName === 'number') {
    const idx = Math.abs(indexOrName) % PlayerPaletteColors.length;
    return PlayerPaletteColors[idx];
  }
  const hash = stainSeed(indexOrName) % PlayerPaletteColors.length;
  return PlayerPaletteColors[hash];
}

export function getPlayerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length > 0) {
    return parts[0][0].toUpperCase();
  }
  return '?';
}
