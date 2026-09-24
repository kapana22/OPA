import { FadeIn, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';

/**
 * აპის მოძრაობა — **მინიმუმი და მხოლოდ მიზეზით**.
 *
 * წესი: ანიმაცია მხოლოდ მაშინ, როცა ეკრანზე რაღაც მართლა იცვლება და ეს
 * მოთამაშემ უნდა შეამჩნიოს (ჯერი სხვაზე გადავიდა, სიიდან ვინმე წაიშალა).
 * ეკრანის გახსნისას არაფერი ხტება და რიგრიგობით არ შემოდის — წვეულებაზე
 * ტელეფონი ხელიდან ხელში გადადის და ყოველი ზედმეტი მოძრაობა აღიზიანებს.
 *
 * ზამბარა და „ხტუნვა“ განზრახ არაა. ყველაფერი სისტემის „მოძრაობის
 * შემცირებას“ ემორჩილება.
 */

/** ჯერი სხვაზე გადავიდა — მშვიდი გამოჩენა, რომ ცვლილება შესამჩნევი იყოს. */
export const turnFade = FadeIn.duration(180).reduceMotion(ReduceMotion.System);

/** სიიდან წაშლა — ელემენტი ქრება, დანარჩენები მშვიდად იწევენ. */
export const listExit = FadeOut.duration(160).reduceMotion(ReduceMotion.System);
export const listLayout = LinearTransition.duration(180).reduceMotion(ReduceMotion.System);
