import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

/**
 * ეკრანის ჩაქრობის მართვა ძრავიდან.
 *
 * Swift-ში ეს `UIApplication.shared.isIdleTimerDisabled` იყო და პირდაპირ
 * ძრავიდან იწერებოდა. `useKeepScreenAwake()` hook-ია და ხედს ეკუთვნის —
 * ძრავს ბრძანებითი ვარიანტი სჭირდება.
 */
/**
 * ცალკე ტეგი: უტეგო `deactivateKeepAwake()` ყველა უტეგო მოთხოვნას ერთად
 * ხსნიდა — ძრავის `release()` რაუნდის ბოლოს ეკრანის hook-საც აუქმებდა და
 * ტელეფონი თამაშის შუაში ჩაქრებოდა.
 */
const TAG = 'opa.engine';

export const Screen = {
  keepAwake(): void {
    void activateKeepAwakeAsync(TAG).catch(() => {});
  },
  release(): void {
    try {
      deactivateKeepAwake(TAG);
    } catch {
      /* ignore */
    }
  },
};
