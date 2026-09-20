import { PlayerAvatarView } from '../src/ui/PlayerAvatarView';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Space, body, title as titleFont } from '../src/theme/theme';
import { SplashBackground } from '../src/ui/SplashBackground';
import { PrimaryButton, GhostButton } from '../src/ui/Buttons';
import { useNightLog, useRoster } from '../src/state/state';
import { useDialog } from '../src/ui/Dialog';

/** პორტი: `Splash/App/ScoreboardView.swift`. */
export default function Scoreboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const roster = useRoster();
  const night = useNightLog();
  const dialog = useDialog();

  const board = roster.leaderboard;
  const hasScores = board.some((p) => p.score > 0);

  const askReset = () =>
    dialog({
      title: 'ახალი საღამო?',
      message: 'ქულები განულდება და საღამოს ჟურნალიც თავიდან დაიწყება. მოთამაშეები რჩება.',
      actions: [
        {
          label: 'დიახ',
          primary: true,
          destructive: true,
          onPress: () => {
            roster.resetScores();
            night.reset();
          },
        },
        { label: 'გაუქმება' },
      ],
    });

  return (
    <View style={{ flex: 1 }}>
      <SplashBackground />
      <View style={{ flex: 1, paddingTop: insets.top + Space.m, gap: 12 }}>
        <Text style={[titleFont(24), { color: Colors.textPrimary, textAlign: 'center' }]}>ტაბლო</Text>

        {board.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[body(16, '600'), { color: Colors.textSecondary, textAlign: 'center' }]}>
              ტაბლო ცარიელია — ჯერ მოთამაშეები დაამატე
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, gap: 8 }}>
            {board.map((player, rank) => (
              <View key={player.id} style={styles.row}>
                <Text style={[body(18, '900'), { color: Colors.textSecondary, width: 34 }]}>{rank + 1}</Text>
                <Text style={[body(17, '600'), { color: Colors.textPrimary, flex: 1 }]} numberOfLines={1}>
                  {player.name}
                </Text>
                <Text
                  style={[
                    titleFont(22),
                    { color: rank === 0 ? Colors.phosphor : Colors.textPrimary, fontVariant: ['tabular-nums'] },
                  ]}
                >
                  {player.score}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 12, gap: 10 }}>
          {hasScores ? (
            <PrimaryButton
              title="ღამის შედეგები"
              icon="square.and.arrow.up"
              tint={Colors.phosphor}
              onPress={() => router.push('/night')}
            />
          ) : null}
          <GhostButton title="ახალი საღამო" icon="arrow.clockwise" onPress={askReset} />
          <GhostButton title="დახურვა" icon="xmark" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space.l },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Space.m,
    paddingVertical: 14,
    borderRadius: Radius.small,
    backgroundColor: Colors.surface,
  },
});
