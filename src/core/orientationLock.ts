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
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);
}

/** ეკრანი არ ჩაქრება — ტაიმერიან თამაშებში აუცილებელია. */
export function useKeepScreenAwake(): void {
  useEffect(() => {
    void activateKeepAwakeAsync().catch(() => {});
    return () => {
      try {
        deactivateKeepAwake();
      } catch {
        /* ignore */
      }
    };
  }, []);
}
