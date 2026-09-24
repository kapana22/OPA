import React, { createContext, useContext, useEffect, useState } from 'react';
import { Roster } from '../core/roster';
import { NightLog } from '../core/nightLog';
import { RecentGames } from '../core/recentGames';
import { hydrate } from '../core/storage';
import { asyncStorageBackend } from '../core/storageBackend';
import { useObservable } from '../core/observable';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { FontSources } from '../theme/theme';
import { Sound } from '../core/sound';

// გამშვები ეკრანი რჩება, სანამ საცავი და შრიფტი არ ჩაიტვირთება —
// თორემ მთავარ ეკრანამდე ცარიელი შავი კადრი ციმციმებდა.
void SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * აპის საერთო მდგომარეობა.
 *
 * Swift-ში ეს `@Environment(Roster.self)` იყო — ერთი ინსტანცია მთელ აპზე.
 *
 * **მნიშვნელოვანი რიგი:** `Roster`, `NightLog` და `RecentGames` კონსტრუქტორში
 * კითხულობენ საცავს, ამიტომ ისინი მხოლოდ `hydrate()`-ის **შემდეგ** უნდა
 * შეიქმნან — თორემ ცარიელ მეხსიერებას ნახავენ და შენახული სია დაიკარგება.
 */

interface AppState {
  roster: Roster;
  night: NightLog;
  recent: RecentGames;
}

const AppContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      hydrate(asyncStorageBackend).catch(() => {
        // საცავი მიუწვდომელია — აპი მაინც უნდა გაიხსნას, უბრალოდ ცარიელი.
      }),
      Font.loadAsync(FontSources).catch(() => {
        // შრიფტი ვერ ჩაიტვირთა — სისტემური შრიფტით გაგრძელდება.
      }),
    ]).then(() => {
      if (cancelled) return;
      setState({ roster: new Roster(), night: new NightLog(), recent: new RecentGames() });
      void SplashScreen.hideAsync().catch(() => {});
      Sound.preload();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state) return null;
  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
}

function useAppState(): AppState {
  const value = useContext(AppContext);
  if (!value) throw new Error('AppStateProvider აკლია');
  return value;
}

export function useRoster(): Roster {
  return useObservable(useAppState().roster);
}
export function useNightLog(): NightLog {
  return useObservable(useAppState().night);
}
export function useRecentGames(): RecentGames {
  return useObservable(useAppState().recent);
}
