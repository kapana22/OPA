import { PixelRatio } from 'react-native';

/**
 * ერთადერთი ადგილი, სადაც ფერები და ფონტები განისაზღვრება.
 *
 * პორტი: `Splash/Theme/Theme.swift`.
 *
 * ვიზუალური მიმართულება — **OPA ოფიციალური პალიტრა**:
 * 1. Phosphor Lime  — #C6FF00 (მთავარი აქცენტი და ლოგოს ძირითადი ზედაპირი)
 * 2. Deep Purple    — #380B70 (ლოგოს 3D depth, headband-ები, UI accent-ები)
 * 3. Near Black     — #07080A (მუქი ფონები, ტექსტი, ტანსაცმელი და კონტრასტი)
 * 4. Warm Cream     — #FAF5E8 (ბარათები და ღია ზედაპირები)
 * 5. Soft Lavender  — #CBB8F6 (background-ები და game-card გარემო)
 */

export const Colors = {
  // MARK: - 1. Phosphor Lime
  phosphorLime: '#C6FF00',
  phosphor: '#C6FF00',
  lime: '#C6FF00',

  // MARK: - 2. Deep Purple / Violet
  deepPurple: '#380B70', // ლოგოს 3D სიღრმე, ტექსტი კრემისფერ ბარათებზე
  violet: '#5B1CB5',     // UI აქცენტი და ბრენდის მე-2 მთავარი ფერი
  deepViolet: '#2A0163', // მუქი იისფერი

  // MARK: - 3. Near Black & Surfaces
  nearBlack: '#07080A',
  ink: '#07080A',
  ink2: '#23143C',
  surface: '#302046',    // Near Black + Soft Lavender ტონით
  surfaceHigh: '#44305D', // ამაღლებული ბარათის ზედაპირი
  stroke: 'rgba(229, 217, 250, 0.20)',
  strokeActive: 'rgba(229, 217, 250, 0.40)',
  overlay: 'rgba(7, 8, 10, 0.82)',

  // MARK: - 4. Warm Cream
  warmCream: '#FAF5E8',
  cream: '#FAF5E8',

  // MARK: - 5. Soft Lavender
  softLavender: '#CBB8F6',
  lavender: '#CBB8F6',
  lavenderDark: '#22163B', // background-ის იისფერი ატმოსფერო

  // სემანტიკური ალიასები (მხოლოდ ამ 5 ფერზე დაფუძნებული, Theme.swift-ის ანალოგიურად):
  neonCyan: '#CBB8F6',
  neonMagenta: '#5B1CB5',
  amber: '#FAF5E8',
  danger: '#380B70',
  coral: '#5B1CB5',
  indigo: '#380B70',
  aqua: '#C6FF00',
  sky: '#CBB8F6',
  teal: '#CBB8F6',
  mint: '#C6FF00',
  pink: '#5B1CB5',
  rose: '#5B1CB5',
  magenta: '#5B1CB5',
  sun: '#FAF5E8',
  skip: '#FAF5E8',
  warning: '#FAF5E8',
  success: '#C6FF00',

  // ტექსტები
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(224, 211, 242, 0.90)', // Soft Lavender tone for readable secondary text
  textTertiary: 'rgba(203, 184, 246, 0.65)',
  textCream: '#FAF5E8',
  onAccent: '#07080A',
} as const;

export type AccentName =
  | 'phosphor'
  | 'neonCyan'
  | 'neonMagenta'
  | 'amber'
  | 'violet'
  | 'aqua'
  | 'softLavender'
  | 'warmCream'
  | 'deepPurple';

// MARK: - გეომეტრია (Theme.swift)
export const Radius = {
  default: 22,
  small: 16,
  tile: 26,
  pill: 999,
} as const;

// MARK: - დაშორება
export const Space = { xs: 6, s: 10, m: 16, l: 24, xl: 32 } as const;

// MARK: - ჩრდილი (Elevation)
export const Elevation = {
  card: {
    shadowColor: '#380B70',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  modal: {
    shadowColor: '#07080A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 12,
  },
  mascot: {
    shadowColor: '#380B70',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

// MARK: - ფონტები (FiraGO Only)
export const FontFamilies = {
  regular: 'FiraGO-Regular',
  medium: 'FiraGO-Medium',
  semiBold: 'FiraGO-SemiBold',
  bold: 'FiraGO-Bold',
  extraBold: 'FiraGO-ExtraBold',
  heavy: 'FiraGO-Heavy',
} as const;

function scaled(size: number, cap = Number.MAX_SAFE_INTEGER): number {
  const scale = Math.max(1, Math.min(PixelRatio.getFontScale(), cap));
  return Math.round(size * scale);
}

export type FontWeight = '400' | '500' | '600' | '700' | '800' | '900';

export interface TextStyleToken {
  fontSize: number;
  fontFamily: string;
  fontWeight?: FontWeight;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

/**
 * გარანტირებულად გარდაქმნის როგორც ქართულ (მთავრული), ისე ლათინურ ტექსტს TT (Uppercase)-ში.
 */
export function toTT(text: string | null | undefined): string {
  if (!text) return '';
  return String(text).toUpperCase();
}

export const display = (size = 38): TextStyleToken => ({
  fontSize: scaled(size, 1.3),
  fontFamily: FontFamilies.heavy,
  fontWeight: '900',
  letterSpacing: 0.8,
  textTransform: 'uppercase',
});

export const title = (size = 24): TextStyleToken => ({
  fontSize: scaled(size, 1.4),
  fontFamily: FontFamilies.extraBold,
  fontWeight: '800',
  letterSpacing: 0.5,
  textTransform: 'uppercase',
});

export const body = (size = 15, weight: FontWeight = '600'): TextStyleToken => ({
  fontSize: scaled(size),
  fontFamily: weight === '900' ? FontFamilies.heavy
    : (weight === '800' || weight === '700') ? FontFamilies.bold
    : weight === '500' ? FontFamilies.medium
    : weight === '400' ? FontFamilies.regular
    : FontFamilies.semiBold,
  fontWeight: weight,
  letterSpacing: 0.2,
});

export const caption = (size = 12, weight: FontWeight = '600'): TextStyleToken => ({
  fontSize: scaled(size),
  fontFamily: (weight === '700' || weight === '800' || weight === '900') ? FontFamilies.bold : FontFamilies.medium,
  fontWeight: weight,
  letterSpacing: 0.15,
});

export function glow(
  color: string,
  intensity: 'soft' | 'medium' | 'strong' = 'medium',
): {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowRadius: number;
  shadowOpacity: number;
} {
  const strength = { soft: 0.18, medium: 0.3, strong: 0.44 }[intensity];
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: intensity === 'strong' ? 20 : 12,
    shadowOpacity: strength,
  };
}

export const Theme = { Colors, Radius, Space, Elevation, glow, display, title, body, caption, toTT } as const;
