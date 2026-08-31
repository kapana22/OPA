import type { AccentName } from '../theme/theme';

/**
 * თამაშების ჯგუფი მთავარ ეკრანზე — ერთნაირი განწყობის თამაშები ერთად დგანან,
 * რომ ოცი ბარათი ერთ გრძელ სიად არ იქცეს.
 *
 * პორტი: `Splash/Core/PartyGame.swift`.
 */
export type GameFamily = 'bluff' | 'loud' | 'reading' | 'candid';

export const familyTitle: Record<GameFamily, string> = {
  bluff: 'ბლეფი და გამოცნობა',
  loud: 'ხმაური და სისწრაფე',
  reading: 'მაგიდის კითხვა',
  candid: 'გულახდილად',
};

/** რამდენად ხმაურიანია თამაში — ღამის ერთზე ეს უფრო მნიშვნელოვანი კითხვაა, ვიდრე ჟანრი. */
export type GameEnergy = 'calm' | 'lively' | 'loud';

export const energyTitle: Record<GameEnergy, string> = {
  calm: 'ჩუმი',
  lively: 'ცოცხალი',
  loud: 'ხმაურიანი',
};

export const energyIcon: Record<GameEnergy, string> = {
  calm: 'moon.fill',
  lively: 'waveform',
  loud: 'speaker.wave.3.fill',
};

/**
 * ერთი მინი-თამაშის აღწერა.
 *
 * ახალი თამაშის დამატება = ერთი ჩანაწერი `catalog.data.json`-ში + ერთი ხაზი
 * `catalog.ts`-ის რეესტრში. არაფერს სხვას არ შეეხები.
 */
export interface PartyGame {
  id: string;
  title: string;
  /** SF Symbol-ის სახელი — `icon()` თარგმნის ამ პლატფორმის აიქონად. */
  icon: string;
  tagline: string;
  accent: AccentName;
  family: GameFamily;
  minPlayers: number;
  maxPlayers: number;
  /** ერთი პარტიის სავარაუდო ხანგრძლივობა წუთებში, ექვსკაციან კომპანიაზე. */
  minutes: number;
  energy: GameEnergy;
  /** თამაში ჯერ არ არის მზად — მთავარ ეკრანზე „მალე“ ნიშნით. */
  comingSoon: boolean;
  /** ახლად დამატებული — „ახალი“ ნიშანი. */
  isNew: boolean;
  /** წესები ნაბიჯებად — მთავარ ეკრანზე „?“ ღილაკით ჩანს. */
  howTo: string[];
  /** დამატებითი სიტყვები ძებნისთვის — შერწყმულ თამაშს რეჟიმების ძველი სახელები აქ აქვს. */
  aliases: string[];
}
