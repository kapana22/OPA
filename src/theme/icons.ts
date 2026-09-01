import type { ComponentProps } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * SF Symbols → MaterialCommunityIcons.
 *
 * **რატომ სჭირდება.** iOS-ზე ყველა აიქონი SF Symbol იყო — ერთი წონა, ერთი
 * ფერი, სისტემისგან. Android-ზე SF Symbols არ არსებობს, ამიტომ მთელი ნაკრები
 * ერთ სხვა ოჯახზე გადადის: ისევ ერთი წონა და ერთი ფერი, ოღონდ ორივე
 * პლატფორმაზე **ერთი და იგივე** — რაც „ერთი აპის“ მთელი აზრია.
 *
 * რუკა ცხადია განზრახ: ხედები SF-ის სახელს ინარჩუნებენ (Swift-ის პორტი
 * ერთი-ერთზე რჩება), თარგმანი კი მხოლოდ აქ ხდება.
 */
const MAP: Record<string, IconName> = {
  // ── კატალოგის თამაშები
  'person.crop.circle.badge.questionmark': 'account-question',
  'person.2.wave.2.fill': 'account-group',
  'eye.slash.fill': 'eye-off',
  'theatermasks.fill': 'drama-masks',
  'iphone.gen3': 'cellphone',
  'flame.fill': 'fire',
  'moon.stars.fill': 'weather-night',
  'square.and.pencil': 'square-edit-outline',
  'bubble.left.and.bubble.right.fill': 'forum',
  'hand.raised.fill': 'hand-back-right',
  'face.dashed.fill': 'emoticon-neutral-outline',
  'megaphone.fill': 'bullhorn',
  'waveform': 'sine-wave',
  'brain.head.profile': 'brain',
  'hand.point.up.left.fill': 'hand-pointing-up',
  'stopwatch.fill': 'timer',
  'checklist': 'format-list-checks',
  'rectangle.stack.fill': 'cards',
  'waterbottle.fill': 'bottle-soda',

  // ── ენერგიის დონე
  'moon.fill': 'weather-night',
  'speaker.wave.3.fill': 'volume-high',

  // ── ბარათების ტიპები (DareKind / RuleCardKind)
  'person.fill': 'account',
  'person.3.fill': 'account-group',
  'hand.point.right.fill': 'hand-pointing-right',
  'bolt.fill': 'flash',
  'gamecontroller.fill': 'gamepad-variant',
  'wind': 'weather-windy',

  // ── ინტერფეისი
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'xmark': 'close',
  'plus': 'plus',
  'trash': 'trash-can-outline',
  'gearshape.fill': 'cog',
  'questionmark.circle': 'help-circle-outline',
  'magnifyingglass': 'magnify',
  'arrow.clockwise': 'refresh',
  'shuffle': 'shuffle-variant',
  'checkmark': 'check',
  'star.fill': 'star',
  'trophy.fill': 'trophy',
  'play.fill': 'play',
  'pause.fill': 'pause',
  'line.3.horizontal': 'menu',
  'wrench.and.screwdriver.fill': 'wrench',
  'hand.tap.fill': 'gesture-tap',
  'person.badge.plus': 'account-plus',
  'person.2.fill': 'account-multiple',
  'clock': 'clock-outline',
  'die.face.5.fill': 'dice-5',
  'slider.horizontal.3': 'tune-variant',
  'xmark.circle.fill': 'close-circle',
  'speaker.wave.2.fill': 'volume-medium',
  'square.and.arrow.up': 'share-variant',
  'arrow.counterclockwise': 'refresh',
  'arrow.up.arrow.down': 'swap-vertical',
  'hands.clap.fill': 'hand-clap',
  'crown.fill': 'crown',
  'flag.checkered': 'flag-checkered',
  'timer': 'timer-sand',
  'burst.fill': 'flare',
  'target': 'target',
  'person.fill.xmark': 'account-remove',
  'person.fill.questionmark': 'account-question-outline',
  'face.smiling': 'emoticon-happy-outline',
  'figure.run': 'run',
  'party.popper.fill': 'party-popper',
  'exclamationmark.circle.fill': 'alert-circle',
  'scope': 'target',
  'cross.case.fill': 'medical-bag',
  'arrow.triangle.2.circlepath': 'sync',
  'arrow.clockwise.circle.fill': 'refresh-circle',
};

/** SF Symbol-ის სახელი → ამ პლატფორმის აიქონი. უცნობი სახელი წრედ იხატება. */
export function icon(sfSymbol: string): IconName {
  return MAP[sfSymbol] ?? 'circle-outline';
}
