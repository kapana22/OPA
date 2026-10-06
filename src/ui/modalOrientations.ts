/**
 * ყველა ფანჯარა (Modal) ყველა ორიენტაციას იღებს.
 *
 * RN-ის Modal ნაგულისხმევად მხოლოდ პორტრეტს უშვებს. შარადებში ეკრანი
 * ლანდშაფტშია ჩაკეტილი, და „გასვლის“ დიალოგის გახსნისას iOS-ს საერთო
 * ორიენტაცია ვერ ჰპოვა — აპი მთლიანად ითიშებოდა (SIGABRT,
 * `__supportedInterfaceOrientations`).
 */
import type { ModalProps } from 'react-native';

export const ALL_ORIENTATIONS: NonNullable<ModalProps['supportedOrientations']> = [
  'portrait',
  'portrait-upside-down',
  'landscape',
  'landscape-left',
  'landscape-right',
];
