import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Space, body, caption, title as titleFont } from '../../src/theme/theme';
import { icon as sf } from '../../src/theme/icons';
import { SplashBackground } from '../../src/ui/SplashBackground';
import { PrimaryButton } from '../../src/ui/Buttons';
import { game as findGame } from '../../src/games/catalog';
import { energyIcon, energyTitle } from '../../src/games/types';

/** პორტი: `Splash/App/RulesView.swift`. */
export default function Rules() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const game = findGame(String(id));

  if (!game) {
    return (
      <View style={{ flex: 1 }}>
        <SplashBackground />
      </View>
    );
  }

  const accent = Colors[game.accent];

  return (
    <View style={{ flex: 1 }}>
      <SplashBackground tint={accent} />
      <View style={{ flex: 1, paddingTop: insets.top, gap: Space.m, alignItems: 'center' }}>
        <View style={[styles.iconBox, { backgroundColor: accent + '1F', marginTop: 32 }]}>
          <MaterialCommunityIcons name={sf(game.icon)} size={30} color={accent} />
        </View>

        <Text style={[titleFont(28), { color: Colors.textPrimary }]}>{game.title}</Text>
        <Text style={[body(15, '500'), styles.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
          {game.tagline}
        </Text>

        {/* სამი რიცხვი, რომელსაც კომპანია პირველ რიგში ეკითხება. */}
        <View style={styles.facts}>
          <Fact icon="person.2.fill" text={`${game.minPlayers}–${game.maxPlayers}`} />
          <Fact icon="clock" text={`~${game.minutes} წთ`} />
          <Fact icon={energyIcon[game.energy]} text={energyTitle[game.energy]} />
        </View>

        {game.comingSoon ? (
          <Text style={[body(14, '700'), { color: Colors.phosphor }]}>ეს თამაში ჯერ მზადდება — მალე გამოჩნდება.</Text>
        ) : null}

        <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} style={{ alignSelf: 'stretch' }}>
          {game.howTo.map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={[styles.stepNumber, { backgroundColor: accent }]}>
                <Text style={[body(13, '900'), { color: Colors.ink }]}>{i + 1}</Text>
              </View>
              <Text style={[body(15, '500'), { color: Colors.textPrimary, flex: 1 }]}>{step}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={{ alignSelf: 'stretch', paddingHorizontal: 20, paddingBottom: insets.bottom + Space.m }}>
          <PrimaryButton title="გასაგებია" tint={accent} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </View>
      </View>
    </View>
  );
}

function Fact({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.factChip}>
      <MaterialCommunityIcons name={sf(icon)} size={11} color={Colors.textSecondary} />
      <Text style={[caption(11), { color: Colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBox: { width: 66, height: 66, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  centered: { textAlign: 'center' },
  facts: { flexDirection: 'row', gap: 8, paddingTop: 2 },
  factChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.surface,
  },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
