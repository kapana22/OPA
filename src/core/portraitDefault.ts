import { useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';

/**
 * აპის ნაგულისხმევი ორიენტაცია — პორტრეტი.
 *
 * ნატიურ დონეზე (`Info.plist` / `AndroidManifest`) ლანდშაფტი **დაშვებულია**,
 * ზუსტად ისე, როგორც ორიგინალ Swift აპში იყო — თორემ `useLandscapeOnly()`
 * შარადებსა და „ვინ ვარ?“-ში iOS-ზე ჩუმად ჩავარდებოდა: `Info.plist` მყარი
 * ჭერია და `lockAsync` მას ვერ გადალახავს.
 *
 * ჭერი რომ აწეულია, ნაგულისხმევ პორტრეტს აპი თვითონ იჭერს — აქ, ერთხელ,
 * გაშვებისას. ორივე შუბლის თამაში გასვლისას პორტრეტს აბრუნებს.
 */
export function usePortraitDefault(): void {
  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);
}
