import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SplashBackground } from '../../src/ui/SplashBackground';
import { ComingSoon } from '../../src/ui/Cards';
import { Colors } from '../../src/theme/theme';
import { game as findGame } from '../../src/games/catalog';
import { gameFlow } from '../../src/games/registry';
import { useRoster } from '../../src/state/state';
import '../../src/games/flows';

/**
 * თამაშის მასპინძელი ეკრანი.
 *
 * პორტი: `navigationDestination(item:)` (`Splash/App/HomeView.swift`).
 * ერთი მარშრუტი ყველა თამაშისთვის — რომელი ეკრანი აიგება, რეესტრი წყვეტს.
 */
export default function GameHost() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const roster = useRoster();

  /**
   * გასვლა. ღრმა ბმულით გახსნისას (ან განახლების შემდეგ) უკან დასაბრუნებელი
   * ისტორია არ არსებობს და `back()` ჩუმად ჩავარდებოდა — თამაშიდან გამოსვლა
   * კი ყოველთვის უნდა მუშაობდეს.
   */
  const exit = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const game = findGame(String(id));
  const Flow = game ? gameFlow(game.id) : undefined;
  const tint = game ? Colors[game.accent] : Colors.neonCyan;

  return (
    <View style={{ flex: 1 }}>
      <SplashBackground tint={tint} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {Flow ? <Flow roster={roster} onExit={exit} /> : <ComingSoon />}
      </SafeAreaView>
    </View>
  );
}
