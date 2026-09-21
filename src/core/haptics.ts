import * as ExpoHaptics from 'expo-haptics';
import { getJSON, setJSON } from './storage';

/**
 * ჰაპტიკა.
 *
 * პორტი: `Splash/Core/Haptics.swift`. **ერთადერთი ადგილი, სადაც პორტი
 * განზრახ არასრულია** — `CHHapticEngine`-ის უწყვეტი ნიმუშები (ცვალებადი
 * ინტენსივობა და სიმკვეთრე დროში) RN-ს არ აქვს.
 *
 * Swift-ს თვითონ ჰქონდა `fallback` სისტემურ გენერატორებზე სიმულატორისა და
 * ძველი მოწყობილობებისთვის — **სწორედ ის რუკა გადმოვიდა ერთი-ერთზე.**
 * მდიდარი ნიმუშები (`boom`, `win`) დროით მიმდევრობით არის მიახლოებული:
 * განზრახვა ნარჩუნდება, ტექსტურა — არა.
 *
 * ყველა გამოძახება „ცეცხლი და დაივიწყე“-ა: ჰაპტიკის ჩავარდნა თამაშს არ აჩერებს.
 */

export type HapticPattern =
  | 'tap' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'
  | 'tick' | 'tickHot' | 'boom' | 'reveal' | 'win';

const ENABLED_KEY = 'splash.haptics.enabled.v1';

/**
 * ვიბრაცია ჩართულია თუ არა. ნაგულისხმევად — ჩართული.
 *
 * ყოველ ჯერზე საცავიდან იკითხება: მოდული `hydrate()`-მდე იტვირთება, ამიტომ
 * იმპორტისას წაკითხვა ყოველთვის `true`-ს აბრუნებდა და გამორთული ვიბრაცია
 * აპის ხელახლა გახსნისას თავისით ირთვებოდა.
 */
function isOn(): boolean {
  return getJSON<boolean>(ENABLED_KEY, true) !== false;
}

const Impact = ExpoHaptics.ImpactFeedbackStyle;
const Notify = ExpoHaptics.NotificationFeedbackType;

function impact(style: ExpoHaptics.ImpactFeedbackStyle): void {
  void ExpoHaptics.impactAsync(style).catch(() => {});
}
function notify(type: ExpoHaptics.NotificationFeedbackType): void {
  void ExpoHaptics.notificationAsync(type).catch(() => {});
}

/** მიმდევრობა — მდიდარი ნიმუშის მიახლოება. `[დაყოვნება მწმ, სიმძლავრე]`. */
function sequence(steps: [number, ExpoHaptics.ImpactFeedbackStyle][]): void {
  for (const [delay, style] of steps) {
    if (delay === 0) impact(style);
    // გამორთვის შემდეგ დაგვიანებული დარტყმებიც აღარ უნდა მოვიდეს.
    else setTimeout(() => isOn() && impact(style), delay);
  }
}

export const Haptics = {
  get isEnabled(): boolean {
    return isOn();
  },

  setEnabled(value: boolean): void {
    setJSON(ENABLED_KEY, value);
  },

  play(pattern: HapticPattern): void {
    if (!isOn()) return;
    switch (pattern) {
      // ── Swift-ის `fallback` რუკა, უცვლელად
      case 'tap':
      case 'tick':
        return impact(Impact.Light);
      case 'medium':
      case 'reveal':
      case 'tickHot':
        return impact(Impact.Medium);
      case 'heavy':
        return impact(Impact.Heavy);
      case 'success':
        return notify(Notify.Success);
      case 'warning':
        return notify(Notify.Warning);
      case 'error':
        return notify(Notify.Error);

      // ── მდიდარი ნიმუშების მიახლოება
      /** აფეთქება — ღრმა ზანზარი, რომელიც ცხრება. */
      case 'boom':
        return sequence([[0, Impact.Heavy], [70, Impact.Heavy], [150, Impact.Medium], [240, Impact.Light]]);
      /** გამარჯვება — სამი ამომავალი დარტყმა. */
      case 'win':
        return sequence([[0, Impact.Light], [110, Impact.Medium], [230, Impact.Heavy]]);
    }
  },

  // ── მოკლე მისამართები (Swift-ის იგივე სახელები)
  tap: () => Haptics.play('tap'),
  medium: () => Haptics.play('medium'),
  heavy: () => Haptics.play('heavy'),
  success: () => Haptics.play('success'),
  warning: () => Haptics.play('warning'),
  error: () => Haptics.play('error'),
  tick: () => Haptics.play('tick'),
  tickHot: () => Haptics.play('tickHot'),
  boom: () => Haptics.play('boom'),
  reveal: () => Haptics.play('reveal'),
  win: () => Haptics.play('win'),
};
