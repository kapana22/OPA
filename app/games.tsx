import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Space, body } from '../src/theme/theme';
import { SplashBackground } from '../src/ui/SplashBackground';
import { GameTile } from '../src/ui/GameTile';
import { ScreenHeader, SectionLabel } from '../src/ui/Cards';
import { Pressable } from '../src/ui/Pressable';
import { GameCatalog, matches, needles } from '../src/games/catalog';
import type { PartyGame } from '../src/games/types';
import { useRoster } from '../src/state/state';
import { useOpenGame } from '../src/state/useOpenGame';
import { ALL_FILTER, accepts, filterKey, filterTitle, newestFirst, visibleFilters, type HomeFilter } from '../src/state/homeFilter';
import { Haptics } from '../src/core/haptics';
import { Icon } from '../src/ui/Icon';

/**
 * „ყველა თამაში“ — სრული ბადე ძებნითა და ფილტრებით.
 *
 * ეს არის ძველი მთავარი ეკრანი: ბადე, ჩიპები და ძებნა აქ გადმოვიდა, რომ
 * მთავარზე მხოლოდ პოპულარული და კატეგორიების რიგები დარჩენილიყო.
 */
export default function AllGames() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const roster = useRoster();
  const open = useOpenGame();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<HomeFilter>(ALL_FILTER);

  const trimmed = query.trim();
  const results = useMemo(() => {
    let games = GameCatalog.filter((g) => accepts(filter, g, roster.count));
    if (trimmed) {
      const n = needles(trimmed);
      games = games.filter((g) => matches(g, n));
    }
    return newestFirst(games);
  }, [filter, trimmed, roster.count]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <View style={{ flex: 1 }}>
      <SplashBackground />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: Space.m }}>
        <ScreenHeader title="ყველა თამაში" subtitle={`${GameCatalog.length} თამაში`} onBack={back} />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Space.m, paddingTop: 14, paddingBottom: insets.bottom + 24, gap: 14 }}
        keyboardDismissMode="interactive"
      >
        {/* ── ძებნა */}
        <View style={styles.searchField}>
          <Icon name={'magnifyingglass'} size={16} color={Colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="იპოვე თამაში — სახელით ან სიტყვით"
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="ძებნა"
            style={[body(15, '500'), { color: Colors.textPrimary, flex: 1 }]}
          />
          {query ? (
            <Pressable accessibilityLabel="გასუფთავება" onPress={() => setQuery('')}>
              <Icon name={'xmark.circle.fill'} size={17} color={Colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>

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

        {results.length === 0 ? (
          <EmptyState
            onReset={() => {
              setQuery('');
              setFilter(ALL_FILTER);
            }}
          />
        ) : (
          <>
            <SectionLabel text={results.length === 1 ? '1 თამაში' : `${results.length} თამაში`} />
            <Grid games={results} playerCount={roster.count} onOpen={open} onInfo={(g) => router.push(`/rules/${g.id}`)} />
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

const styles = StyleSheet.create({
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  // `flexGrow` კენტ ბოლო ფილას მთელ რიგზე წელავდა — iOS-ის `LazyVGrid`
  // ამას არ აკეთებდა. ფიქსირებული სიგანე ორსვეტიან ბადეს ინარჩუნებს.
  gridCell: { width: '48%' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
});
