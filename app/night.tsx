import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius, body, caption, display, title as titleFont } from '../src/theme/theme';
import { SplashBackground } from '../src/ui/SplashBackground';
import { PageHeader } from '../src/ui/PageHeader';
import { useNightLog, useRoster } from '../src/state/state';
import { game as findGame } from '../src/games/catalog';
import { Icon } from '../src/ui/Icon';

/**
 * „ღამის შედეგები“ — საღამოს ბოლოს გასაზიარებელი ბარათი.
 *
 * პორტი: `Splash/App/NightSummaryView.swift` — საღამოს შეჯამება ეკრანზე
 * (გაზიარების გარეშე).
 */
export default function NightSummary() {
  const insets = useSafeAreaInsets();
  const roster = useRoster();
  const night = useNightLog();

  const ranked = roster.leaderboard.filter((p) => p.score > 0);
  const best = ranked[0]?.score ?? 0;
  const topWinners = best > 0 ? ranked.filter((p) => p.score === best) : [];
  const runnersUp = ranked.filter((p) => p.score < best).slice(0, 2);
  // ადგილი სპორტული წესით: თანაბარ ქულას ერთი ადგილი აქვს (11, 11 → 2, 2).
  const placeOf = (score: number) => ranked.filter((p) => p.score > score).length + 1;

  const favouriteID = night.favouriteID;
  const favourite = favouriteID ? findGame(favouriteID) : undefined;
  const favouriteCount = favouriteID ? night.plays[favouriteID] ?? 0 : 0;

  const playedIDs = night.playedIDs;
  const titles = playedIDs.map((id) => findGame(id)?.title).filter((t): t is string => !!t).slice(0, 3);
  const more = playedIDs.length - titles.length;
  const playedTitles = titles.length ? titles.join(' · ') + (more > 0 ? ` +${more}` : '') : '';


  if (ranked.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <SplashBackground />
        <PageHeader title="ღამის შედეგები" />
        <View style={styles.empty}>
          <Icon name={'moon.stars.fill'} size={28} color={Colors.textSecondary} />
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
          <View style={styles.cardFrame}>
          <View style={styles.card}>
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
                  <View>
                    <Icon name={'crown.fill'} size={26} color={Colors.amber} />
                  </View>
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
                  {runnersUp.map((p) => (
                    <View key={p.id} style={styles.runner}>
                      <Text style={[caption(10), { color: Colors.textSecondary }]}>{placeOf(p.score)}</Text>
                      <Text style={[body(14, '700'), { color: Colors.textPrimary }]} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={[body(14, '800'), { color: Colors.textSecondary, fontVariant: ['tabular-nums'] }]}>
                        {p.score}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {favourite && favouriteCount > 1 ? (
              <View style={styles.highlight}>
                <Icon name={favourite.icon} size={12} color={Colors.phosphor} />
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
          </View>
          </View>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  cardFrame: { width: '100%', maxWidth: 360 },
  card: {
    width: '100%',
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
