import { useEffect } from 'react';
import { AppState, BackHandler, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SplashBackground } from '../../src/ui/SplashBackground';
import { ComingSoon, Notice } from '../../src/ui/Cards';
import { game as findGame } from '../../src/games/catalog';
import { renderGameFlow } from '../../src/games/registry';
import { useRoster } from '../../src/state/state';
import { useKeepScreenAwake } from '../../src/core/orientationLock';
import { Sound } from '../../src/core/sound';
import { GamePause } from '../../src/core/ticker';
import { useDialog } from '../../src/ui/Dialog';
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

  // წვეულების თამაშში ტელეფონი ხელიდან ხელში გადადის და მაგიდაზე დევს
  // განხილვისას — ტაიმერის გარეშე ფაზებშიც ეკრანი არ უნდა ჩაქრეს.
  useKeepScreenAwake();
  // გასვლისას (მათ შორის ჟესტით) დაწყებული ბგერა ეკრანს არ უნდა გაჰყვეს.
  useEffect(() => () => Sound.stop(), []);

  // ზარი, Control Center, სხვა აპი — ტაიმერი ფონზე არ უნდა იწურებოდეს (ალიასი,
  // ბომბი, სიტყვების სისწრაფე...). დაბრუნებისას იქიდან გრძელდება, სადაც გაჩერდა.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') GamePause.release('background');
      else GamePause.hold('background');
    });
    return () => {
      sub.remove();
      GamePause.release('background');
      GamePause.release('exit-dialog');
    };
  }, []);

  // Android-ის „უკან“ ღილაკი თამაშს დაუკითხავად ხურავდა — ისევე როგორც ✕,
  // ჯერ ვეკითხებით. (iOS-ზე უკან გასრიალება `_layout`-ში გამორთულია.)
  const dialog = useDialog();
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      GamePause.hold('exit-dialog');
      dialog({
        title: 'თამაშიდან გასვლა?',
        message: 'მიმდინარე რაუნდი დაიკარგება.',
        onClose: () => GamePause.release('exit-dialog'),
        actions: [
          { label: 'გაგრძელება' },
          { label: 'გასვლა', primary: true, destructive: true, onPress: exit },
        ],
      });
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog]);

  const game = findGame(String(id));
  const flow = game ? renderGameFlow(game.id, { roster, onExit: exit }) : null;

  // მთავარი ეკრანი ამას ადრევე ამოწმებს, ღრმა ბმული კი — არა. ცარიელი როსტერით
  // ძრავი ცარიელ ეკრანზე ჩერდება, ამიტომ კარი აქვე იკეტება, გამოსასვლელით.
  const tooFew = game && !game.comingSoon && roster.count < game.minPlayers;

  return (
    <View style={{ flex: 1 }}>
      <SplashBackground pattern={game?.id} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
        {tooFew ? (
          <Notice
            icon="person.3.fill"
            title="ჯერ ცოტანი ხართ"
            text={`${game.title} — მინიმუმ ${game.minPlayers} მოთამაშე სჭირდება.`}
            onBack={exit}
          />
        ) : flow ? (
          flow
        ) : (
          <ComingSoon onBack={exit} />
        )}
      </SafeAreaView>
    </View>
  );
}
