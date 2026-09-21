import { useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Colors, Elevation, Radius, body, caption, glow, title as titleFont, toTT, FontFamilies } from '../src/theme/theme';
import { icon as sf } from '../src/theme/icons';
import { SplashBackground } from '../src/ui/SplashBackground';
import { GameTile, MiniGameTile } from '../src/ui/GameTile';
import { SectionLabel } from '../src/ui/Cards';
import { Pressable } from '../src/ui/Pressable';
import { GameCatalog, gamesByIDs } from '../src/games/catalog';
import { gameArtwork, gameCaptions } from '../src/games/artwork';
import { familyTitle, type GameFamily, type PartyGame } from '../src/games/types';
import { useNightLog, useRecentGames, useRoster } from '../src/state/state';
import { useOpenGame } from '../src/state/useOpenGame';
import { popularIDs } from '../src/state/popular';
import { newestFirst } from '../src/state/homeFilter';
import { Haptics } from '../src/core/haptics';
import { useDialog } from '../src/ui/Dialog';

const FAMILIES: GameFamily[] = ['loud', 'bluff', 'reading', 'candid'];

const FAMILY_CONFIG: Record<GameFamily, { icon: string; color: string }> = {
  loud: { icon: 'bolt.fill', color: Colors.phosphor },
  bluff: { icon: 'theatermasks.fill', color: Colors.neonMagenta },
  reading: { icon: 'book.closed.fill', color: Colors.softLavender },
  candid: { icon: 'heart.fill', color: Colors.coral },
};

/**
 * მთავარი ეკრანი — OPA-ს ორიგინალი დიზაინი ჰორიზონტალური გადასაქროლი რიგებით.
 */
export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const roster = useRoster();
  const night = useNightLog();
  const recent = useRecentGames();
  const dialog = useDialog();
  const open = useOpenGame();

  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const columnWidth = Math.floor((windowWidth - 32 - 12) / 2);

  const catalogIDs = useMemo(() => GameCatalog.map((g) => g.id), []);
  const popular = useMemo(
    () => gamesByIDs(popularIDs(night.plays, catalogIDs)),
    [night.plays, catalogIDs],
  );

  const visibleRecentIDs = recent.visibleIDs(catalogIDs);
  const recentGames = useMemo(() => gamesByIDs(visibleRecentIDs), [visibleRecentIDs, catalogIDs]);
  const recentGame = recentGames[0];

  const gamesByFamily = useMemo(() => {
    const map = new Map<GameFamily, PartyGame[]>();
    for (const f of FAMILIES) {
      map.set(
        f,
        GameCatalog.filter((g) => g.family === f),
      );
    }
    return map;
  }, []);

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
    const chosen = playable[Math.floor(Math.random() * playable.length)];
    recent.record(chosen.id);
    night.record(chosen.id);
    open(chosen);
    return chosen;
  };

  const openInfo = (g: PartyGame) => router.push(`/rules/${g.id}`);

  const handleGamePress = (g: PartyGame) => {
    if (g.comingSoon) {
      openInfo(g);
      return;
    }
    if (roster.count < g.minPlayers) {
      dialog({
        title: 'მეტი მოთამაშე გვჭირდება',
        message: `${g.title} მინიმუმ ${g.minPlayers} მოთამაშეს მოითხოვს. სიაში ${roster.count} მოთამაშეა.`,
        actions: [
          { label: 'მოთამაშეების დამატება', primary: true, onPress: () => router.push('/players') },
          { label: 'წესების ნახვა', onPress: () => openInfo(g) },
          { label: 'გაუქმება' },
        ],
      });
      return;
    }
    recent.record(g.id);
    night.record(g.id);
    open(g);
  };

  const isFiltering = query.trim().length > 0;
  const filteredGames = useMemo(() => {
    if (!isFiltering) return [];
    const q = query.trim().toLowerCase();
    const list = GameCatalog.filter((g) => {
      if (g.title.toLowerCase().includes(q)) return true;
      if (g.tagline.toLowerCase().includes(q)) return true;
      if (g.aliases?.some((a) => a.toLowerCase().includes(q))) return true;
      return false;
    });
    return newestFirst(list);
  }, [query, isFiltering]);

  return (
    <View style={styles.root}>
      <SplashBackground home />

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 90,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. HEADER ROW (OPA Logo + Shuffle + Search) ── */}
        <View style={[styles.headerRow, styles.gutter]}>
          <Image
            source={require('../assets/Logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessible
            accessibilityLabel="OPA ლოგო"
          />

          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="შემთხვევითი თამაშის არჩევა. შემირჩიე"
              onPress={() => {
                Haptics.medium();
                openRandom();
              }}
              style={styles.randomHeaderButton}
            >
              <MaterialCommunityIcons name={sf('shuffle')} size={14} color={Colors.phosphor} />
              <Text style={styles.randomHeaderText}>{toTT('შემირჩიე')}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={searchOpen ? 'ძიების დახურვა' : 'თამაშის ძიება'}
              onPress={() => {
                Haptics.tap();
                setSearchOpen((prev) => !prev);
              }}
              style={styles.iconButton}
            >
              <MaterialCommunityIcons
                name={sf(searchOpen ? 'xmark' : 'magnifyingglass')}
                size={18}
                color={Colors.textPrimary}
              />
            </Pressable>
          </View>
        </View>

        {/* ── 2. WELCOME TITLE ── */}
        <View style={[styles.welcomeRow, styles.gutter]}>
          <View style={{ width: 3, height: 25, backgroundColor: Colors.phosphor, ...glow(Colors.phosphor, 'strong') }} />
          <Text style={[titleFont(23), styles.welcomeTitle, { color: Colors.warmCream }]}>
            {toTT('რას ვითამაშებთ?')}
          </Text>
        </View>

        {/* ── SEARCH BAR (თუ გახსნილია) ── */}
        {searchOpen && (
          <View style={[styles.gutter]}>
            <View style={styles.searchBar}>
              <MaterialCommunityIcons name={sf('magnifyingglass')} size={18} color={Colors.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="მოძებნე თამაში..."
                placeholderTextColor={Colors.textSecondary}
                style={styles.searchInput}
                autoFocus
                returnKeyType="search"
              />
              {query.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="გასუფთავება"
                  onPress={() => setQuery('')}
                  hitSlop={8}
                >
                  <MaterialCommunityIcons name={sf('xmark.circle.fill')} size={16} color={Colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* ── ძებნის შედეგები ── */}
        {isFiltering ? (
          <View style={[styles.gutter, { gap: 12 }]}>
            <Text style={[caption(12), { color: Colors.textSecondary }]}>
              ნაპოვნია {filteredGames.length} თამაში
            </Text>
            {filteredGames.length > 0 ? (
              <View style={styles.grid}>
                {filteredGames.map((game) => (
                  <View key={game.id} style={{ width: columnWidth }}>
                    <GameTile
                      game={game}
                      playerCount={roster.count}
                      onPlay={() => handleGamePress(game)}
                      onInfo={() => openInfo(game)}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={[body(15, '600'), { color: Colors.textPrimary }]}>თამაში ვერ მოიძებნა</Text>
                <Text style={[caption(12), { color: Colors.textSecondary }]}>სცადე სხვა სიტყვა</Text>
              </View>
            )}
          </View>
        ) : (
          <>
            {/* ── 3. RECENT GAME / HERO ── */}
            {recentGame && (
              <View style={[styles.gutter]}>
                <RecentGameCard
                  game={recentGame}
                  onPress={() => {
                    Haptics.medium();
                    open(recentGame);
                  }}
                />
              </View>
            )}

            {/* ── 4. POPULAR ROW ── */}
            {popular.length > 0 && (
              <View style={{ gap: 10 }}>
                <View style={styles.gutter}>
                  <SectionLabel text="პოპულარული" icon="flame.fill" accentColor={Colors.phosphor} />
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalRow}
                >
                  {popular.map((game) => (
                    <MiniGameTile
                      key={game.id}
                      game={game}
                      playerCount={roster.count}
                      onPlay={() => handleGamePress(game)}
                      onInfo={() => openInfo(game)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* ── 5. FAMILIES ── */}
            {FAMILIES.map((family) => {
              const list = gamesByFamily.get(family) ?? [];
              if (list.length === 0) return null;
              const conf = FAMILY_CONFIG[family];
              return (
                <View key={family} style={{ gap: 10 }}>
                  <View style={styles.gutter}>
                    <SectionLabel
                      text={familyTitle[family]}
                      icon={conf.icon}
                      accentColor={conf.color}
                      trailing={String(list.length)}
                    />
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalRow}
                  >
                    {list.map((game) => (
                      <MiniGameTile
                        key={game.id}
                        game={game}
                        playerCount={roster.count}
                        onPlay={() => handleGamePress(game)}
                        onInfo={() => openInfo(game)}
                      />
                    ))}
                  </ScrollView>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* ── FLOATING GLASS DOCK (Bottom Navigation) ── */}
      <View style={[styles.dockContainer, { bottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.floatingDock}>
          <Pressable accessibilityRole="button" accessibilityLabel="თამაშები" style={[styles.dockItem, styles.dockItemActive]}>
            <MaterialCommunityIcons name={sf('gamecontroller.fill')} size={22} color={Colors.phosphor} />
            <Text numberOfLines={1} style={styles.dockTextActive}>თამაშები</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="მოთამაშეები"
            onPress={() => {
              Haptics.tap();
              router.push('/players');
            }}
            style={styles.dockItem}
          >
            <View style={styles.dockIconWrap}>
              <MaterialCommunityIcons name={sf('person.2.fill')} size={22} color={Colors.textSecondary} />
              {roster.count > 0 ? (
                <View style={styles.dockBadge}>
                  <Text style={styles.dockBadgeText}>{roster.count}</Text>
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={styles.dockText}>მოთამაშე</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ტაბლო"
            onPress={() => {
              Haptics.tap();
              router.push('/scoreboard');
            }}
            style={styles.dockItem}
          >
            <MaterialCommunityIcons name={sf('trophy.fill')} size={22} color={Colors.textSecondary} />
            <Text numberOfLines={1} style={styles.dockText}>ტაბლო</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="პარამეტრები"
            onPress={() => {
              Haptics.tap();
              router.push('/settings');
            }}
            style={styles.dockItem}
          >
            <MaterialCommunityIcons name={sf('slider.horizontal.3')} size={22} color={Colors.textSecondary} />
            <Text numberOfLines={1} style={styles.dockText}>მართვა</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function RecentGameCard({ game, onPress }: { game: PartyGame; onPress: () => void }) {
  const artwork = gameArtwork[game.id];
  const captionText = gameCaptions[game.id] ?? game.tagline;

  return (
    <View style={styles.recentWrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`ბოლოს ითამაშეთ ${game.title}`}
        onPress={onPress}
        style={styles.recentHeroCard}
      >
        <View style={styles.recentPosterWrap}>
          {artwork ? (
            <Image source={artwork} style={styles.recentPosterImage} resizeMode="cover" accessible={false} />
          ) : (
            <View style={styles.recentFallbackArtwork}>
              <MaterialCommunityIcons name={sf(game.icon)} size={28} color={Colors[game.accent]} />
            </View>
          )}
        </View>

        <View style={styles.recentInfo}>
          <View style={styles.recentBadge}>
            <MaterialCommunityIcons name={sf('clock.arrow.circlepath')} size={12} color={Colors.phosphor} />
            <Text style={styles.recentBadgeText}>{toTT('ბოლოს ითამაშეთ')}</Text>
          </View>
          <Text style={[titleFont(18), { color: Colors.warmCream, letterSpacing: 0.5 }]} numberOfLines={1}>
            {toTT(game.title)}
          </Text>
          <Text style={[caption(11, '500'), { color: Colors.textSecondary, lineHeight: 15 }]} numberOfLines={2}>
            {captionText}
          </Text>
        </View>

        <View style={styles.recentChevronCircle}>
          <MaterialCommunityIcons name={sf('chevron.right')} size={16} color={Colors.textSecondary} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ink,
  },
  gutter: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  logo: {
    width: 110,
    height: 38,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  randomHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(198, 255, 0, 0.12)',
    borderWidth: 1.2,
    borderColor: 'rgba(198, 255, 0, 0.35)',
  },
  randomHeaderText: {
    fontSize: 11,
    fontFamily: FontFamilies.heavy,
    color: Colors.phosphor,
    letterSpacing: 0.4,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(203, 184, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(203, 184, 246, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeRow: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  welcomeTitle: {
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.default,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamilies.medium,
    color: Colors.textPrimary,
    padding: 0,
  },
  horizontalRow: {
    paddingHorizontal: 16,
    gap: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },

  // Recent Game Hero Card
  recentWrapper: {
    width: '100%',
    ...Elevation.card,
  },
  recentHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: Radius.default,
    backgroundColor: 'rgba(26, 14, 44, 0.90)',
    borderWidth: 1,
    borderColor: 'rgba(203, 184, 246, 0.20)',
  },
  recentPosterWrap: {
    width: 80,
    height: 106,
    borderRadius: Radius.small,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  recentPosterImage: {
    width: '100%',
    height: '100%',
  },
  recentFallbackArtwork: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  recentInfo: {
    flex: 1,
    gap: 4,
  },
  recentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  recentBadgeText: {
    fontSize: 10.5,
    fontFamily: FontFamilies.heavy,
    color: Colors.phosphor,
    letterSpacing: 0.3,
  },
  recentChevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(203, 184, 246, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(203, 184, 246, 0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },

  // Floating Glass Dock
  dockContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 999,
  },
  floatingDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 380,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(23, 13, 38, 0.94)',
    borderWidth: 1.2,
    borderColor: 'rgba(203, 184, 246, 0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  dockItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 20,
  },
  dockItemActive: {
    backgroundColor: 'rgba(198, 255, 0, 0.12)',
  },
  dockIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockText: {
    fontSize: 9.5,
    fontFamily: FontFamilies.bold,
    color: Colors.textSecondary,
    letterSpacing: 0.1,
    textAlign: 'center',
    width: '100%',
  },
  dockTextActive: {
    fontSize: 9.5,
    fontFamily: FontFamilies.heavy,
    color: Colors.phosphor,
    letterSpacing: 0.1,
    textAlign: 'center',
    width: '100%',
  },
  dockBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.phosphor,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  dockBadgeText: {
    fontSize: 9,
    fontFamily: FontFamilies.heavy,
    color: Colors.ink,
  },
});
