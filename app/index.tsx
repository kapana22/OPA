import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Svg, { Path } from 'react-native-svg';

import { Colors, Radius, Space, body, caption, display, title as titleFont } from '../src/theme/theme';
import { icon as sf } from '../src/theme/icons';
import { SplashBackground } from '../src/ui/SplashBackground';
import { GameTile } from '../src/ui/GameTile';
import { SectionLabel } from '../src/ui/Cards';
import { Pressable } from '../src/ui/Pressable';
import { splashPath } from '../src/ui/splashShape';
import { GameCatalog, matches, needles, gamesByIDs } from '../src/games/catalog';
import { familyTitle, type GameFamily, type PartyGame } from '../src/games/types';
import { useNightLog, useRecentGames, useRoster } from '../src/state/state';
import { ALL_FILTER, accepts, filterKey, filterTitle, newestFirst, visibleFilters, type HomeFilter } from '../src/state/homeFilter';
import { Haptics } from '../src/core/haptics';
import { useDialog } from '../src/ui/Dialog';

const FAMILIES: GameFamily[] = ['bluff', 'loud', 'reading', 'candid'];

/** პორტი: `Splash/App/HomeView.swift`. */
export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const roster = useRoster();
  const night = useNightLog();
  const recent = useRecentGames();
  const dialog = useDialog();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<HomeFilter>(ALL_FILTER);
  const [searchOpen, setSearchOpen] = useState(false);

  const trimmed = query.trim();
  const isFiltering = trimmed.length > 0 || filter.kind !== 'all';

  const results = useMemo(() => {
    let games = GameCatalog.filter((g) => accepts(filter, g, roster.count));
    if (trimmed) {
      const n = needles(trimmed);
      games = games.filter((g) => matches(g, n));
    }
    return newestFirst(games);
  }, [filter, trimmed, roster.count]);

  const open = (game: PartyGame) => {
    if (game.comingSoon) {
      router.push(`/rules/${game.id}`);
      return;
    }
    if (roster.count < game.minPlayers) {
      dialog({
        title: 'ჯერ ცოტანი ხართ',
        message: `${game.title} — მინიმუმ ${game.minPlayers} მოთამაშე სჭირდება.`,
        actions: [
          { label: 'მოთამაშეების დამატება', primary: true, onPress: () => router.push('/players') },
          { label: 'კარგი' },
        ],
      });
      return;
    }
    recent.record(game.id);
    night.record(game.id);
    router.push(`/game/${game.id}`);
  };

  const openRandom = () => {
    // ფილტრი ჩართულია? მაშინ კამათი მხოლოდ ხილულ თამაშებზეა.
    const pool = isFiltering ? results : GameCatalog;
    const playable = pool.filter((g) => !g.comingSoon && roster.count >= g.minPlayers);
    if (playable.length === 0) {
      dialog({
        title: 'ჯერ ცოტანი ხართ',
        message: 'დაამატე მოთამაშეები და სცადე თავიდან.',
        actions: [
          { label: 'მოთამაშეების დამატება', primary: true, onPress: () => router.push('/players') },
          { label: 'კარგი' },
        ],
      });
      return;
    }
    open(playable[Math.floor(Math.random() * playable.length)]);
  };

  const top = roster.leaderboard.filter((p) => p.score > 0).slice(0, 3);
  const recentGames = gamesByIDs(recent.visibleIDs(GameCatalog.map((g) => g.id)));

  return (
    <View style={{ flex: 1 }}>
      <SplashBackground tint={Colors.neonCyan} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Space.m, paddingTop: insets.top, paddingBottom: 32, gap: 14 }}
        keyboardDismissMode="interactive"
      >
        {/* ── ლოგო */}
        <View style={styles.logo}>
          <Text style={[display(38), { color: Colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
            მეგობრები
          </Text>
          <View style={styles.logoRow}>
            <Svg width={9} height={9}>
              <Path d={splashPath({ lobes: 9, wobble: 0.3, seed: 777, size: 9 })} fill={Colors.phosphor} />
            </Svg>
            <Text style={[body(13, '600'), { color: Colors.textSecondary }]}>ერთი ტელეფონი, მთელი კომპანია</Text>
          </View>
        </View>

        {/* ── მოთამაშეების ზოლი */}
        <View style={styles.playersBar}>
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
              <Text style={[caption(11), { color: Colors.textSecondary }]}>მოთამაშეები</Text>
              <Text style={[body(14, '700'), { color: Colors.textPrimary }]} numberOfLines={1}>
                {roster.count === 0 ? 'შეავსე სია' : roster.names.join(', ')}
              </Text>
            </View>
          </Pressable>

          <IconButton
            name={searchOpen ? 'xmark' : 'magnifyingglass'}
            label={searchOpen ? 'ძებნის დახურვა' : 'ძებნა'}
            onPress={() => {
              setSearchOpen((v) => {
                if (v) setQuery('');
                return !v;
              });
            }}
          />
          <IconButton name="die.face.5.fill" label="შემთხვევითი თამაში" onPress={openRandom} />
          <IconButton name="trophy.fill" label="ტაბლო" onPress={() => router.push('/scoreboard')} />
          <IconButton name="slider.horizontal.3" label="პარამეტრები" onPress={() => router.push('/settings')} />
          <View style={{ width: 10 }} />
        </View>

        {/* ── ტაბლოს ზოლი */}
        {top.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={'ტაბლო: ' + top.map((p) => `${p.name} ${p.score}`).join(', ')}
            onPress={() => {
              Haptics.tap();
              router.push('/scoreboard');
            }}
            style={styles.scoreStrip}
          >
            <MaterialCommunityIcons name={sf('trophy.fill')} size={13} color={Colors.phosphor} />
            {top.map((player, rank) => (
              <View key={player.id} style={styles.scoreEntry}>
                <Text
                  style={[body(13, rank === 0 ? '900' : '600'), { color: rank === 0 ? Colors.textPrimary : Colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {player.name}
                </Text>
                <Text style={[body(13, '900'), { color: rank === 0 ? Colors.phosphor : Colors.textSecondary }]}>
                  {player.score}
                </Text>
                {rank < top.length - 1 ? (
                  <Text style={[caption(11), { color: Colors.textSecondary, opacity: 0.5 }]}>·</Text>
                ) : null}
              </View>
            ))}
            <View style={{ flex: 1 }} />
            <MaterialCommunityIcons name={sf('chevron.right')} size={12} color={Colors.textSecondary} />
          </Pressable>
        ) : null}

        {/* ── ძებნა */}
        {searchOpen ? (
          <View style={styles.searchField}>
            <MaterialCommunityIcons name={sf('magnifyingglass')} size={16} color={Colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="იპოვე თამაში — სახელით ან სიტყვით"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={[body(15, '500'), { color: Colors.textPrimary, flex: 1 }]}
            />
            {query ? (
              <Pressable accessibilityLabel="გასუფთავება" onPress={() => setQuery('')}>
                <MaterialCommunityIcons name={sf('xmark.circle.fill')} size={17} color={Colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* ── ფილტრები */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
          {visibleFilters(roster.count).map((option) => {
            const selected = filterKey(filter) === filterKey(option);
            return (
              <Pressable
                key={filterKey(option)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  Haptics.tap();
                  setFilter(selected ? ALL_FILTER : option);
                }}
                style={[styles.chip, { backgroundColor: selected ? Colors.phosphor : Colors.surface }]}
              >
                <Text
                  style={[body(14, selected ? '900' : '600'), { color: selected ? Colors.onAccent : Colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {filterTitle(option)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── შიგთავსი */}
        {isFiltering ? (
          results.length === 0 ? (
            <EmptyState
              onReset={() => {
                setQuery('');
                setFilter(ALL_FILTER);
                setSearchOpen(false);
              }}
            />
          ) : (
            <>
              <SectionLabel text={results.length === 1 ? '1 თამაში' : `${results.length} თამაში`} />
              <Grid games={results} playerCount={roster.count} onOpen={open} onInfo={(g) => router.push(`/rules/${g.id}`)} />
            </>
          )
        ) : (
          <>
            {recentGames.length > 0 ? (
              <View style={{ gap: 8 }}>
                <SectionLabel text="ბოლოს ითამაშეთ" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                  {recentGames.map((game) => (
                    <Pressable
                      key={game.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${game.title}. ბოლოს ნათამაშები`}
                      onPress={() => {
                        Haptics.medium();
                        open(game);
                      }}
                      style={[styles.recentChip, { borderColor: Colors[game.accent] + '47' }]}
                    >
                      <MaterialCommunityIcons name={sf(game.icon)} size={16} color={Colors[game.accent]} />
                      <Text style={[body(14, '700'), { color: Colors.textPrimary }]} numberOfLines={1}>
                        {game.title}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {FAMILIES.map((family) => {
              const games = newestFirst(GameCatalog.filter((g) => g.family === family));
              if (games.length === 0) return null;
              return (
                <View key={family} style={{ gap: 12 }}>
                  <SectionLabel text={familyTitle[family]} trailing={String(games.length)} />
                  <Grid games={games} playerCount={roster.count} onOpen={open} onInfo={(g) => router.push(`/rules/${g.id}`)} />
                </View>
              );
            })}

            <Text style={[body(12, '500'), { color: Colors.textSecondary, opacity: 0.8, paddingTop: 10 }]}>
              ინტერნეტი არ სჭირდება — მხოლოდ კარგი კომპანია.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Grid({
  games,
  playerCount,
  onOpen,
  onInfo,
}: {
  games: PartyGame[];
  playerCount: number;
  onOpen: (g: PartyGame) => void;
  onInfo: (g: PartyGame) => void;
}) {
  return (
    <View style={styles.grid}>
      {games.map((game) => (
        <View key={game.id} style={styles.gridCell}>
          <GameTile game={game} playerCount={playerCount} onPlay={() => onOpen(game)} onInfo={() => onInfo(game)} />
        </View>
      ))}
    </View>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <View style={styles.empty}>
      <Text style={[body(17, '900'), { color: Colors.textPrimary }]}>ვერაფერი მოიძებნა</Text>
      <Text style={[body(13, '500'), { color: Colors.textSecondary, textAlign: 'center' }]}>
        სცადე სხვა სიტყვა ან ფილტრი მოხსენი.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          Haptics.tap();
          onReset();
        }}
        style={[styles.chip, { backgroundColor: Colors.phosphor, marginTop: 4 }]}
      >
        <Text style={[body(14, '900'), { color: Colors.onAccent }]}>ყველა თამაშის ჩვენება</Text>
      </Pressable>
    </View>
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

const styles = StyleSheet.create({
  logo: { alignItems: 'center', gap: 5, paddingTop: 20, paddingBottom: 2 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },

  playersBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: Radius.default, backgroundColor: Colors.surface },
  playersButton: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 12, paddingVertical: 11 },
  countBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  iconButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' },

  scoreStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Space.m,
    paddingVertical: 11,
    borderRadius: Radius.small,
    backgroundColor: Colors.surface,
  },
  scoreEntry: { flexDirection: 'row', alignItems: 'center', gap: 5 },

  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Space.m,
    paddingVertical: 14,
    borderRadius: Radius.small,
    backgroundColor: Colors.surface,
  },

  chip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 999, justifyContent: 'center' },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: Colors.surface,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  // `flexGrow` კენტ ბოლო ფილას მთელ რიგზე წელავდა — iOS-ის `LazyVGrid`
  // ამას არ აკეთებდა. ფიქსირებული სიგანე ორსვეტიან ბადეს ინარჩუნებს.
  gridCell: { width: '48%' },

  empty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
});
