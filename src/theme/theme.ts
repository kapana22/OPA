import { PixelRatio } from 'react-native';

/**
 * ერთადერთი ადგილი, სადაც ფერები და ფონტები განისაზღვრება.
 *
 * პორტი: `Splash/Theme/Theme.swift`.
 *
 * ვიზუალური მიმართულება — **მაგიდა და ლაქა**: ფონი ბრტყელი და თითქმის შავია,
 * როგორც ღამის მაგიდა; თითოეული თამაში კი სავსე ფერის ბლოკია. ბნელ ოთახში,
 * ხელიდან ხელში გადაცემულ ტელეფონზე მხოლოდ კონტრასტი კითხულობს.
 */

// MARK: - ფერები
//
// პალიტრა ორ ფერზე დგას: **შავი და ფოსფორი**. ფოსფორი მოქმედების ფერია.
// ციანი და მაჯენტა მხოლოდ რიტმისთვისაა. სხვა ფერი აპში არ არსებობს.

export const Colors = {
  /** მაგიდა — ბრტყელი, თითქმის შავი. */
  ink: '#07080A',
  /** ოდნავ ამოწეული ზედაპირი. */
  ink2: '#0E1013',
  /** ბარათის ზედაპირი. */
  surface: '#101215',
  /** უფრო ღია ზედაპირი — ჩიპები და ველები ბარათის შიგნით. */
  surfaceHigh: '#191C21',
  stroke: 'rgba(255,255,255,0.07)',

  /** ფოსფორი — აპის მთავარი ფერი. */
  phosphor: '#C6FF00',
  /** ნეონის ციანი — მეორე აქცენტი. */
  neonCyan: '#00E5D0',
  /** ნეონის მაჯენტა — მესამე აქცენტი, ყველაზე იშვიათი. */
  neonMagenta: '#FF2BD6',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.5)',
  /** ნეონზე დაწერილი ტექსტი — მაგიდის ფერი, არა თეთრი. */
  onAccent: '#07080A',
} as const;

export type AccentName = 'phosphor' | 'neonCyan' | 'neonMagenta';

// MARK: - გეომეტრია
export const Radius = { default: 22, small: 16, tile: 26 } as const;

// MARK: - დაშორება
export const Space = { xs: 6, s: 10, m: 16, l: 24, xl: 32 } as const;

// MARK: - ფონტები
//
// ქართულს **დიდი ასოები არ აქვს** — `textTransform: 'uppercase'` აკრძალულია;
// იერარქიას მხოლოდ ზომა და სისქე ქმნის.
//
// **განსხვავება iOS-თან.** Swift `UIFontMetrics`-ს იყენებდა და `SF Georgian
// Rounded`-ს — Apple-ის ფონტს, რომელიც Android-ზე არ არსებობს. აქ ორივე
// პლატფორმაზე ერთი ჩაშენებული ფონტი დგას, მასშტაბი კი `PixelRatio`-დან მოდის.
// ჭერები Swift-იდან უცვლელია.

/** მომხმარებლის შრიფტის მასშტაბი, ჭერით. */
function scaled(size: number, cap = Number.MAX_SAFE_INTEGER): number {
  const scale = Math.max(1, Math.min(PixelRatio.getFontScale(), cap));
  return Math.round(size * scale);
}

export type FontWeight = '400' | '500' | '600' | '700' | '800' | '900';

export interface TextStyleToken {
  fontSize: number;
  fontWeight: FontWeight;
}

/** გმირული ზომა — მთავარი ეკრანის ლოგო, დიდი რიცხვები. ჭერი 1.30×. */
export const display = (size = 40): TextStyleToken => ({ fontSize: scaled(size, 1.3), fontWeight: '900' });
/** სათაური. ჭერი 1.45×. */
export const title = (size = 26): TextStyleToken => ({ fontSize: scaled(size, 1.45), fontWeight: '800' });
/** ძირითადი ტექსტი — სრულად იზრდება, ჭერის გარეშე. */
export const body = (size = 16, weight: FontWeight = '600'): TextStyleToken => ({ fontSize: scaled(size), fontWeight: weight });
/** წვრილი ტექსტი — სწორედ ის, რასაც კითხვა უჭირს — სრულად იზრდება. */
export const caption = (size = 12): TextStyleToken => ({ fontSize: scaled(size), fontWeight: '600' });

export const Theme = { Colors, Radius, Space, display, title, body, caption } as const;
