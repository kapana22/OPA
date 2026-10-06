import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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
import { LaunchAnimation } from '../ui/LaunchAnimation';
import { Animated, Easing, View } from 'react-native';
import { recordStartupTiming } from '../core/startupTiming';

// ნატიური ეკრანი მხოლოდ ანიმაციის პირველ კადრამდე რჩება.
// საცავი და შრიფტები ანიმაციის პარალელურად იტვირთება.
SplashScreen.setOptions({ fade: false, duration: 0 });
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
  const [contentEntry] = useState(() => new Animated.Value(0));
  const revealHome = useCallback((reduceMotion: boolean) => {
    if (reduceMotion) {
      contentEntry.setValue(1);
      return;
    }
    Animated.timing(contentEntry, {
      toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [contentEntry]);
  const [state, setState] = useState<AppState | null>(null);
  const [launchFinished, setLaunchFinished] = useState(false);
  const finishLaunch = useCallback(() => {
    recordStartupTiming('homeVisible');
    setLaunchFinished(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    recordStartupTiming('preparationStarted');
    void Promise.all([
      hydrate(asyncStorageBackend).catch(() => {
        // საცავი მიუწვდომელია — აპი მაინც უნდა გაიხსნას, უბრალოდ ცარიელი.
      }).then(() => recordStartupTiming('storageReady')),
      Font.loadAsync(FontSources).catch(() => {
        // შრიფტი ვერ ჩაიტვირთა — სისტემური შრიფტით გაგრძელდება.
      }).then(() => recordStartupTiming('fontsReady')),
    ]).then(() => {
      if (cancelled) return;
      setState({ roster: new Roster(), night: new NightLog(), recent: new RecentGames() });
      recordStartupTiming('appReady');
      // Create native audio players after the launch animation, away from its first frames.
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!state || !launchFinished) return;
    const timer = setTimeout(() => Sound.preload(), 0);
    return () => clearTimeout(timer);
  }, [state, launchFinished]);

  return (
    <View style={{ flex: 1 }}>
      {state && (
        <Animated.View style={{ flex: 1, opacity: contentEntry,
          transform: [{ translateY: contentEntry.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}
          accessibilityElementsHidden={!launchFinished}
          importantForAccessibility={launchFinished ? 'auto' : 'no-hide-descendants'}>
          <AppContext.Provider value={state}>{children}</AppContext.Provider>
        </Animated.View>
      )}
      {!launchFinished && <LaunchAnimation ready={Boolean(state)} onReveal={revealHome} onFinish={finishLaunch} />}
    </View>
  );
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
