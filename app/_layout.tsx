import React from 'react';
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
              <Stack.Screen
                name="players"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: [1.0],
                  sheetGrabberVisible: true,
                  gestureEnabled: true,
                }}
              />
              <Stack.Screen
                name="scoreboard"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: [1.0],
                  sheetGrabberVisible: true,
                  gestureEnabled: true,
                }}
              />
              <Stack.Screen
                name="settings"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: [1.0],
                  sheetGrabberVisible: true,
                  gestureEnabled: true,
                }}
              />
              <Stack.Screen
                name="rules/[id]"
                options={{
                  presentation: 'formSheet',
                  sheetAllowedDetents: [1.0],
                  sheetGrabberVisible: true,
                  gestureEnabled: true,
                }}
              />
            </Stack>
          </DialogProvider>
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
