import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SplashBackground } from '../../src/ui/SplashBackground';
import { ComingSoon, Notice } from '../../src/ui/Cards';
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

  // მთავარი ეკრანი ამას ადრევე ამოწმებს, ღრმა ბმული კი — არა. ცარიელი როსტერით
  // ძრავი ცარიელ ეკრანზე ჩერდება, ამიტომ კარი აქვე იკეტება, გამოსასვლელით.
  const tooFew = game && !game.comingSoon && roster.count < game.minPlayers;

  return (
    <View style={{ flex: 1 }}>
      <SplashBackground tint={tint} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {tooFew ? (
          <Notice
            icon="person.3.fill"
            title="ჯერ ცოტანი ხართ"
            text={`${game.title} — მინიმუმ ${game.minPlayers} მოთამაშე სჭირდება.`}
            onBack={exit}
          />
        ) : Flow ? (
          <Flow roster={roster} onExit={exit} />
        ) : (
          <ComingSoon onBack={exit} />
        )}
      </SafeAreaView>
    </View>
  );
}
