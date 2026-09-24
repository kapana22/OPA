import { Image, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, body, caption, display, title as titleFont } from '../src/theme/theme';
import { icon as sf } from '../src/theme/icons';
import { SplashBackground } from '../src/ui/SplashBackground';
import { PrimaryButton } from '../src/ui/Buttons';
import { PageHeader } from '../src/ui/PageHeader';
import { useNightLog, useRoster } from '../src/state/state';
import { game as findGame } from '../src/games/catalog';
import Animated from 'react-native-reanimated';
import { Confetti } from '../src/ui/Confetti';
import { enterUp, popIn } from '../src/ui/motion';

/**
 * „ღამის შედეგები“ — საღამოს ბოლოს გასაზიარებელი ბარათი.
 *
 * პორტი: `Splash/App/NightSummaryView.swift`. Swift-ში ბარათი სურათად
 * გადადიოდა (`ImageRenderer`); აქ ჯერ ტექსტად ზიარდება — სურათისთვის
 * `react-native-view-shot` სჭირდება, ანუ ნატიური ხელახალი აწყობა.
 */
export default function NightSummary() {
  const insets = useSafeAreaInsets();
  const roster = useRoster();
  const night = useNightLog();

  const ranked = roster.leaderboard.filter((p) => p.score > 0);
  const best = ranked[0]?.score ?? 0;
  const topWinners = best > 0 ? ranked.filter((p) => p.score === best) : [];
  const runnersUp = ranked.filter((p) => p.score < best).slice(0, 2);

  const favouriteID = night.favouriteID;
  const favourite = favouriteID ? findGame(favouriteID) : undefined;
  const favouriteCount = favouriteID ? night.plays[favouriteID] ?? 0 : 0;

  const playedIDs = night.playedIDs;
  const titles = playedIDs.map((id) => findGame(id)?.title).filter((t): t is string => !!t).slice(0, 3);
  const more = playedIDs.length - titles.length;
  const playedTitles = titles.length ? titles.join(' · ') + (more > 0 ? ` +${more}` : '') : '';

  const share = () => {
    const lines = [`ღამის შედეგები — ${night.dateLabel()}`];
    if (topWinners.length) {
      lines.push(
        `👑 ${topWinners.map((p) => p.name).join(' და ')} — ${best} ქულა${topWinners.length > 1 ? ' (ფრე!)' : ''}`,
      );
    }
    runnersUp.forEach((p, i) => lines.push(`${topWinners.length + i + 1}. ${p.name} — ${p.score}`));
    if (favourite && favouriteCount > 1) lines.push(`საღამოს თამაში — ${favourite.title} ×${favouriteCount}`);
    Share.share({ message: lines.join('\n') }).catch(() => {});
  };

  if (ranked.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <SplashBackground />
        <PageHeader title="ღამის შედეგები" />
        <View style={styles.empty}>
          <MaterialCommunityIcons name={sf('moon.stars.fill')} size={28} color={Colors.textSecondary} />
          <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>საღამო ჯერ არ დაწყებულა</Text>
          <Text style={[body(14, '500'), { color: Colors.textSecondary, textAlign: 'center' }]}>
            ითამაშეთ ერთი პარტია მაინც — შედეგები აქ გამოჩნდება.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <SplashBackground />
      <PageHeader title="ღამის შედეგები" />
      <View style={{ flex: 1, paddingBottom: insets.bottom + 12 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
          <Animated.View entering={popIn(80)} style={styles.card}>
            <View style={styles.header}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[titleFont(21), { color: Colors.textPrimary }]}>ღამის შედეგები</Text>
                <Text style={[caption(12), { color: Colors.textSecondary }]}>{night.dateLabel()}</Text>
              </View>
              {night.totalGames > 0 ? (
                <View style={{ alignItems: 'center' }}>
                  <Text style={[display(26), { color: Colors.phosphor, fontVariant: ['tabular-nums'] }]}>
                    {night.totalGames}
                  </Text>
                  <Text style={[caption(10), { color: Colors.textSecondary }]}>პარტია</Text>
                </View>
              ) : null}
            </View>

            <View style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
              {topWinners.length ? (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Animated.View entering={popIn(450)}>
                    <MaterialCommunityIcons name={sf('crown.fill')} size={26} color={Colors.amber} />
                  </Animated.View>
                  <Text
                    style={[titleFont(topWinners.length > 1 ? 26 : 34), { color: Colors.textPrimary, textAlign: 'center' }]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                  >
                    {topWinners.map((p) => p.name).join(' და ')}
                  </Text>
                  <Text style={[body(15, '700'), { color: Colors.amber, fontVariant: ['tabular-nums'] }]}>
                    {best} ქულა{topWinners.length > 1 ? ' (ფრე!)' : ''}
                  </Text>
                </View>
              ) : null}

              {runnersUp.length ? (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {runnersUp.map((p, i) => (
                    <Animated.View key={p.id} entering={enterUp(6 + i)} style={styles.runner}>
                      <Text style={[caption(10), { color: Colors.textSecondary }]}>{topWinners.length + i + 1}</Text>
                      <Text style={[body(14, '700'), { color: Colors.textPrimary }]} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={[body(14, '800'), { color: Colors.textSecondary, fontVariant: ['tabular-nums'] }]}>
                        {p.score}
                      </Text>
                    </Animated.View>
                  ))}
                </View>
              ) : null}
            </View>

            {favourite && favouriteCount > 1 ? (
              <View style={styles.highlight}>
                <MaterialCommunityIcons name={sf(favourite.icon)} size={12} color={Colors.phosphor} />
                <Text style={[body(12, '700'), { color: Colors.textPrimary, flexShrink: 1 }]} numberOfLines={1}>
                  საღამოს თამაში — {favourite.title}
                </Text>
                <Text style={[caption(11), { color: Colors.textSecondary }]}>×{favouriteCount}</Text>
              </View>
            ) : null}

            <View style={{ alignItems: 'center', gap: 10 }}>
              {playedTitles ? (
                <Text style={[caption(11), { color: Colors.textSecondary, textAlign: 'center' }]} numberOfLines={2}>
                  {playedTitles}
                </Text>
              ) : null}
              <Image source={require('../assets/Logo.png')} style={{ height: 22, width: 90 }} resizeMode="contain" />
            </View>
          </Animated.View>
        </View>

        <Animated.View entering={enterUp(8)} style={{ paddingHorizontal: 24, gap: 10 }}>
          <PrimaryButton title="გაზიარება" icon="square.and.arrow.up" tint={Colors.phosphor} onPress={share} />
        </Animated.View>
      </View>
      {/* საღამოს დასასრული ზეიმია — კონფეტი ერთხელ, ბარათის გამოჩენისას. */}
      <Confetti />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  card: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: 360 / 450,
    borderRadius: 26,
    backgroundColor: Colors.ink,
    borderWidth: 1,
    borderColor: Colors.stroke,
    padding: 22,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  runner: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: Colors.surface,
  },
  highlight: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginBottom: 14,
    borderRadius: Radius.default,
    backgroundColor: 'rgba(198, 255, 0, 0.12)',
  },
});
