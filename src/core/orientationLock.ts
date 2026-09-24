import { useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

/**
 * ეკრანის ორიენტაციისა და ჩაქრობის მართვა.
 *
 * პორტი: `Splash/Core/OrientationLock.swift` — იქ `ViewModifier`-ები იყო
 * (`.landscapeOnly()`, `.keepScreenAwake()`), აქ hook-ები.
 *
 * აპი მთლიანად პორტრეტულია, გარდა შარადებისა — იქ ტელეფონი შუბლზეა და
 * სიტყვა შორიდან უნდა იკითხებოდეს, ანუ ლანდშაფტი სჭირდება.
 */

/** ეკრანი ლანდშაფტში ჩაიკეტება, გასვლისას პორტრეტი ბრუნდება. */
export function useLandscapeOnly(): void {
  useEffect(() => {
    let active = true;

    // ორივე ლანდშაფტი: აპი პორტრეტშია ჩაკეტილი, ამიტომ „მიმდინარე“ ორიენტაცია
    // ყოველთვის PORTRAIT_UP იყო და ყოველთვის LANDSCAPE_RIGHT ირჩეოდა — ვინც ტელეფონს
    // მეორე მხრით იდებდა შუბლზე, მაგიდა სიტყვას თავდაყირა ხედავდა.
    // დახრას ეს არ ცვლის — სენსორი გრავიტაციის z-ს (ეკრანის ნორმალს) კითხულობს.
    const lockLandscape = async () => {
      if (!active) return;
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    };

    void lockLandscape();

    return () => {
      active = false;
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);
}

let nextTag = 0;

/**
 * ეკრანი არ ჩაქრება — ტაიმერიან თამაშებში აუცილებელია.
 *
 * ყოველ გამოძახებას თავისი ტეგი აქვს, რომ ერთის მოხსნამ (მაგ. შიდა ეკრანის
 * დახურვამ) თამაშის მასპინძლის მოთხოვნა არ გააუქმოს.
 */
export function useKeepScreenAwake(): void {
  useEffect(() => {
    const tag = `opa.screen.${nextTag++}`;
    void activateKeepAwakeAsync(tag).catch(() => {});
    return () => {
      try {
        deactivateKeepAwake(tag);
      } catch {
        /* ignore */
      }
    };
  }, []);
}
