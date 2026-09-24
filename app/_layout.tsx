import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../src/theme/theme';
import { AppStateProvider } from '../src/state/state';
import { DialogProvider } from '../src/ui/Dialog';
import { usePortraitDefault } from '../src/core/portraitDefault';

/**
 * აპის ფესვი.
 *
 * პორტი: `Splash/App/SplashApp.swift`.
 *
 * `AppStateProvider` საცავს ჯერ ჩატვირთავს და მხოლოდ მერე აშენებს `Roster`-ს —
 * თორემ შენახული შემადგენლობა პირველივე კადრში დაიკარგებოდა.
 */
/**
 * ტაბლო, მოთამაშეები, პარამეტრები, წესები და ღამის შედეგები — **სრულ ეკრანზე**.
 * ადრე ქვემოდან ამოსრიალებული ფურცელი იყო და დასახურად ჩამოსრიალება სჭირდებოდა;
 * ახლა ზემოთ „უკან“ ღილაკია (`PageHeader`), iOS-ზე კი უკან გასრიალება
 * ეკრანის ნებისმიერი ადგილიდან მუშაობს და არა მხოლოდ კიდიდან.
 */
const PAGE = { gestureEnabled: true, fullScreenGestureEnabled: true } as const;

export default function RootLayout() {
  usePortraitDefault();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.ink }}>
      <SafeAreaProvider>
        <AppStateProvider>
          <DialogProvider>
          <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.ink },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="index" />
              {/* კიდიდან შემთხვევითი გასრიალება რაუნდს უსიტყვოდ წყვეტდა — გასვლა მხოლოდ ✕-ით, დადასტურებით. */}
              <Stack.Screen name="game/[id]" options={{ gestureEnabled: false }} />
              <Stack.Screen name="players" options={PAGE} />
              <Stack.Screen name="scoreboard" options={PAGE} />
              <Stack.Screen name="night" options={PAGE} />
              <Stack.Screen name="settings" options={PAGE} />
              <Stack.Screen name="rules/[id]" options={PAGE} />
            </Stack>
          </DialogProvider>
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
