import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Colors, Radius, Space, body, caption, display, title as titleFont } from '../src/theme/theme';
import { icon as sf } from '../src/theme/icons';
import { SplashBackground } from '../src/ui/SplashBackground';
import { MiniGameTile } from '../src/ui/GameTile';
import { SectionLabel } from '../src/ui/Cards';
import { Pressable } from '../src/ui/Pressable';
import { GameCatalog, game as findGame, gamesByIDs } from '../src/games/catalog';
import { familyTitle, type GameFamily, type PartyGame } from '../src/games/types';
import { useNightLog, useRecentGames, useRoster } from '../src/state/state';
import { useOpenGame } from '../src/state/useOpenGame';
import { popularIDs } from '../src/state/popular';
import { newestFirst } from '../src/state/homeFilter';
import { Haptics } from '../src/core/haptics';
import { useDialog } from '../src/ui/Dialog';

const FAMILIES: GameFamily[] = ['loud', 'bluff', 'reading', 'candid'];

/**
 * მთავარი ეკრანი.
 *
 * პორტი: `Splash/App/HomeView.swift`, გადაწყობილი.
 *
 * **რას ასწორებს.** ცხრამეტი თანაბარი ფილა ორ სვეტად სამ ეკრანზე იშლებოდა და
 * ღამის ერთზე თამაშის არჩევა თვითონ თამაშზე დიდხანს გრძელდებოდა. ახლა პირველ
 * ეკრანზე მხოლოდ სამი გადაწყვეტილებაა: ვინ თამაშობს, რას ვაგრძელებთ და რა არის
 * პოპულარული. დანარჩენი — კატეგორიების რიგებში და „ყველა თამაში“-ში.
 */
export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const roster = useRoster();
  const night = useNightLog();
  const recent = useRecentGames();
  const dialog = useDialog();
  const open = useOpenGame();

  const catalogIDs = useMemo(() => GameCatalog.map((g) => g.id), []);
  const popular = useMemo(() => gamesByIDs(popularIDs(night.plays, catalogIDs)), [night.plays, catalogIDs]);
  const lastPlayed = gamesByIDs(recent.visibleIDs(catalogIDs))[0];
  const leader = roster.leaderboard[0];
  const hasScores = leader !== undefined && leader.score > 0;

  const openRandom = (): PartyGame | null => {
    const playable = GameCatalog.filter((g) => !g.comingSoon && roster.count >= g.minPlayers);
    if (playable.length === 0) {
      dialog({
        title: 'ჯერ ცოტანი ხართ',
        message: 'დაამატე მოთამაშეები და სცადე თავიდან.',
        actions: [
          { label: 'მოთამაშეების დამატება', primary: true, onPress: () => router.push('/players') },
          { label: 'კარგი' },
        ],
      });
      return null;
    }
    return playable[Math.floor(Math.random() * playable.length)];
  };

  const openInfo = (g: PartyGame) => router.push(`/rules/${g.id}`);

  return (
    <View style={{ flex: 1 }}>
      <SplashBackground tint={Colors.neonCyan} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24, gap: 14 }}>
        {/* ── ლოგო + პარამეტრები */}
        <View style={[styles.logoRow, Layout.gutter]}>
          <View style={{ width: 38 }} />
          <View style={{ flex: 1, alignItems: 'center', gap: 3 }}>
            <Text style={[display(36), { color: Colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
              მეგობრები
            </Text>
            {/* პოზიციონირება მხოლოდ პირველ გახსნაზე — ცარიელ სიასთან ერთად ქრება. */}
            {roster.count === 0 ? (
              <Text style={[caption(12), { color: Colors.textSecondary }]}>უფასო · რეკლამის გარეშე · ოფლაინ</Text>
            ) : null}
          </View>
          <IconButton name="slider.horizontal.3" label="პარამეტრები" onPress={() => router.push('/settings')} />
        </View>

        {/* ── მოთამაშეების ბარათი */}
        <View style={[styles.playersBar, Layout.gutter]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={roster.count === 0 ? 'მოთამაშეები. სია ცარიელია' : `მოთამაშეები: ${roster.names.join(', ')}`}
            accessibilityHint="სიის შესაცვლელად დააჭირე"
            onPress={() => {
              Haptics.tap();
              router.push('/players');
            }}
            style={styles.playersButton}
          >
            <View style={[styles.countBadge, { backgroundColor: roster.count === 0 ? Colors.textSecondary : Colors.neonCyan }]}>
              <Text style={[body(16, '900'), { color: Colors.onAccent }]}>{roster.count}</Text>
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={[caption(11), { color: Colors.textSecondary }]} numberOfLines={1}>
                {hasScores ? `მოთამაშეები · ლიდერი ${leader.name} ${leader.score}` : 'მოთამაშეები'}
              </Text>
              <Text style={[body(14, '700'), { color: Colors.textPrimary }]} numberOfLines={1}>
                {roster.count === 0 ? 'შეავსე სია' : roster.names.join(', ')}
              </Text>
            </View>
            <MaterialCommunityIcons name={sf(roster.count === 0 ? 'plus' : 'square.and.pencil')} size={16} color={Colors.textSecondary} />
          </Pressable>
          <IconButton name="trophy.fill" label="ტაბლო" onPress={() => router.push('/scoreboard')} />
          <View style={{ width: 10 }} />
        </View>

        {/* ── გააგრძელე / შემთხვევითი */}
        <View style={Layout.gutter}>
          {lastPlayed ? (
            <ContinueCard
              game={lastPlayed}
              playerCount={roster.count}
              onPlay={() => open(lastPlayed)}
              onRandom={() => {
                const g = openRandom();
                if (g) open(g);
              }}
            />
          ) : (
            <RandomCard pick={openRandom} onLand={open} />
          )}
        </View>

        {/* ── პოპულარული */}
        <View style={{ gap: 10 }}>
          <View style={Layout.gutter}>
            <SectionLabel text="პოპულარული" />
          </View>
          <Row>
            {popular.map((g) => (
              <MiniGameTile key={g.id} game={g} size="popular" playerCount={roster.count} onPlay={() => open(g)} onInfo={() => openInfo(g)} />
            ))}
          </Row>
        </View>

        {/* ── კატეგორიები */}
        {FAMILIES.map((family) => {
          const games = newestFirst(GameCatalog.filter((g) => g.family === family));
          if (games.length === 0) return null;
          return (
            <View key={family} style={{ gap: 10 }}>
              <View style={Layout.gutter}>
                <SectionLabel text={familyTitle[family]} trailing={String(games.length)} />
              </View>
              <Row>
                {games.map((g) => (
                  <MiniGameTile key={g.id} game={g} playerCount={roster.count} onPlay={() => open(g)} onInfo={() => openInfo(g)} />
                ))}
              </Row>
            </View>
          );
        })}

        {/* ── ყველა თამაში */}
        <View style={Layout.gutter}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`ყველა თამაში, ${GameCatalog.length}. ძებნა და ფილტრები`}
            onPress={() => {
              Haptics.tap();
              router.push('/games');
            }}
            style={styles.allGames}
          >
            <MaterialCommunityIcons name={sf('magnifyingglass')} size={17} color={Colors.textPrimary} />
            <Text style={[body(16, '800'), { color: Colors.textPrimary, flex: 1 }]}>ყველა თამაში ({GameCatalog.length})</Text>
            <MaterialCommunityIcons name={sf('chevron.right')} size={16} color={Colors.textSecondary} />
          </Pressable>
        </View>

        <Text style={[body(12, '500'), { color: Colors.textSecondary, opacity: 0.8, textAlign: 'center' }]}>
          ინტერნეტი არ სჭირდება — მხოლოდ კარგი კომპანია.
        </Text>
      </ScrollView>
    </View>
  );
}

/** ჰორიზონტალური რიგი, რომელიც ეკრანის კიდემდე მიდის — ფილები გვერდიდან „შემოდიან“. */
function Row({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: Space.m, gap: 10 }}
    >
      {children}
    </ScrollView>
  );
}

/** ბოლოს ნათამაშები — ერთი დაჭერით ისევ იქ, სადაც გაჩერდით. */
function ContinueCard({
  game,
  playerCount,
  onPlay,
  onRandom,
}: {
  game: PartyGame;
  playerCount: number;
  onPlay: () => void;
  onRandom: () => void;
}) {
  const accent = Colors[game.accent];
  const meta = [playerCount > 0 ? `${playerCount} მოთამაშე` : `${game.minPlayers}–${game.maxPlayers} მოთამაშე`, `${game.minutes} წთ`].join(' · ');
  return (
    <View style={[styles.hero, { borderColor: accent + '55' }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`გააგრძელე: ${game.title}. ${meta}`}
        onPress={() => {
          Haptics.medium();
          onPlay();
        }}
        style={styles.heroMain}
      >
        <View style={[styles.heroIcon, { backgroundColor: accent }]}>
          <MaterialCommunityIcons name={sf('play.fill')} size={24} color={Colors.onAccent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[caption(11), { color: accent }]}>გააგრძელე</Text>
          <Text style={[titleFont(22), { color: Colors.textPrimary }]} numberOfLines={1}>
            {game.title}
          </Text>
          <Text style={[caption(12), { color: Colors.textSecondary }]} numberOfLines={1}>
            {meta}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="შემთხვევითი თამაში"
        onPress={() => {
          Haptics.tap();
          onRandom();
        }}
        hitSlop={6}
        style={styles.heroDice}
      >
        <MaterialCommunityIcons name={sf('die.face.5.fill')} size={22} color={Colors.textPrimary} />
      </Pressable>
    </View>
  );
}

/**
 * „შემთხვევითი თამაში“ — ჩნდება, სანამ ჟურნალი ცარიელია.
 *
 * კამათელი მუდმივად ოდნავ ირხევა; დაჭერაზე ბარათი რამდენიმე სახელს
 * გადაფურცლავს (ყოველზე პატარა ტკაცუნი) და ბოლოზე ჩერდება — ისე, როგორც
 * მაგიდაზე დაგორებული კამათელი. თვითონ არჩევანი მანამდეა გაკეთებული.
 */
function RandomCard({ pick, onLand }: { pick: () => PartyGame | null; onLand: (g: PartyGame) => void }) {
  const [preview, setPreview] = useState<PartyGame | null>(null);
  const rolling = useRef(false);
  const wobble = useSharedValue(0);
  const spin = useSharedValue(0);

  useEffect(() => {
    wobble.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(-1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
  }, [wobble]);

  const diceStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wobble.value * 9 + spin.value * 360}deg` }, { translateY: wobble.value * -2 }],
  }));

  const roll = () => {
    if (rolling.current) return;
    const chosen = pick();
    if (!chosen) return;
    rolling.current = true;
    spin.value = 0;
    spin.value = withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) });

    // გადაფურცვლა: 5 შემთხვევითი სახელი, ბოლოს — არჩეული.
    const pool = GameCatalog.filter((g) => g.id !== chosen.id);
    const frames = Array.from({ length: 5 }, () => pool[Math.floor(Math.random() * pool.length)]);
    frames.forEach((g, i) => {
      setTimeout(() => {
        Haptics.tick();
        setPreview(g);
      }, 90 + i * 110);
    });
    setTimeout(() => {
      Haptics.success();
      setPreview(chosen);
    }, 90 + frames.length * 110);
    setTimeout(() => {
      rolling.current = false;
      setPreview(null);
      onLand(chosen);
    }, 90 + frames.length * 110 + 420);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="შემთხვევითი თამაში"
      accessibilityHint="კამათელი აირჩევს თამაშს კომპანიის ზომაზე"
      onPress={roll}
      style={[styles.hero, styles.heroMain, { borderColor: Colors.phosphor + '55' }]}
    >
      <Animated.View style={[styles.heroIcon, { backgroundColor: Colors.phosphor }, diceStyle]}>
        <MaterialCommunityIcons name={sf('die.face.5.fill')} size={26} color={Colors.onAccent} />
      </Animated.View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[caption(11), { color: Colors.phosphor }]}>არ იცით, რა ითამაშოთ?</Text>
        <Text style={[titleFont(22), { color: Colors.textPrimary }]} numberOfLines={1}>
          {preview ? preview.title : 'შემთხვევითი თამაში'}
        </Text>
        <Text style={[caption(12), { color: Colors.textSecondary }]} numberOfLines={1}>
          {preview ? `${preview.minPlayers}–${preview.maxPlayers} · ${preview.minutes} წთ` : 'კამათელი აირჩევს კომპანიის ზომაზე'}
        </Text>
      </View>
    </Pressable>
  );
}

function IconButton({ name, label, onPress }: { name: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        Haptics.tap();
        onPress();
      }}
      style={styles.iconButton}
    >
      <MaterialCommunityIcons name={sf(name)} size={16} color={Colors.textPrimary} />
    </Pressable>
  );
}

const Layout = StyleSheet.create({
  gutter: { paddingHorizontal: Space.m },
});

const styles = StyleSheet.create({
  logoRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 14, paddingBottom: 2 },

  playersBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playersButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 12,
    paddingRight: 14,
    paddingVertical: 11,
    borderRadius: Radius.default,
    backgroundColor: Colors.surface,
  },
  countBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  iconButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.tile,
    backgroundColor: Colors.surface,
    borderWidth: 1,
  },
  heroMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  heroIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heroDice: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },

  allGames: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Space.m,
    paddingVertical: 16,
    borderRadius: Radius.default,
    backgroundColor: Colors.surface,
  },
});
