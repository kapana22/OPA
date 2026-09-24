import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, Space, body, title as titleFont } from '../src/theme/theme';
import { SplashBackground } from '../src/ui/SplashBackground';
import { PrimaryButton, GhostButton } from '../src/ui/Buttons';
import { PageHeader } from '../src/ui/PageHeader';
import { useNightLog, useRoster } from '../src/state/state';
import { useDialog } from '../src/ui/Dialog';
import Animated from 'react-native-reanimated';
import { enterUp, listLayout, popIn } from '../src/ui/motion';
import { Icon } from '../src/ui/Icon';

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
      <PageHeader title="ტაბლო" />
      <View style={{ flex: 1, gap: 12 }}>

        {board.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[body(16, '600'), { color: Colors.textSecondary, textAlign: 'center' }]}>
              ტაბლო ცარიელია — ჯერ მოთამაშეები დაამატე
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, gap: 8 }}
          >
            {board.map((player, rank) => (
              <Animated.View key={player.id} entering={enterUp(rank)} layout={listLayout} style={styles.row}>
                <Text style={[body(18, '900'), { color: Colors.textSecondary, width: 34 }]}>{rank + 1}</Text>
                <Text style={[body(17, '600'), { color: Colors.textPrimary, flex: 1 }]} numberOfLines={1}>
                  {player.name}
                </Text>
                {rank === 0 && player.score > 0 ? (
                  <Animated.View entering={popIn(420)} style={{ marginRight: 8 }}>
                    <Icon name={'crown.fill'} size={20} color={Colors.phosphor} />
                  </Animated.View>
                ) : null}
                <Text
                  style={[
                    titleFont(22),
                    { color: rank === 0 ? Colors.phosphor : Colors.textPrimary, fontVariant: ['tabular-nums'] },
                  ]}
                >
                  {player.score}
                </Text>
              </Animated.View>
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
