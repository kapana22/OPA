import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

/**
 * ეკრანის ჩაქრობის მართვა ძრავიდან.
 *
 * Swift-ში ეს `UIApplication.shared.isIdleTimerDisabled` იყო და პირდაპირ
 * ძრავიდან იწერებოდა. `useKeepScreenAwake()` hook-ია და ხედს ეკუთვნის —
 * ძრავს ბრძანებითი ვარიანტი სჭირდება.
 */
export const Screen = {
  keepAwake(): void {
    void activateKeepAwakeAsync().catch(() => {});
  },
  release(): void {
    try {
      deactivateKeepAwake();
    } catch {
      /* ignore */
    }
  },
};
