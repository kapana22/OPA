import { Image, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { Colors, Elevation, Radius, body, caption } from '../theme/theme';
import { type PartyGame } from '../games/types';
import { gameArtwork, gameCaptions } from '../games/artwork';
import { groupedGames } from '../games/groups';
import { Haptics } from '../core/haptics';
import { Pressable } from './Pressable';
import { Icon } from './Icon';

interface TileProps {
  game: PartyGame;
  playerCount?: number;
  onPlay: () => void;
  onInfo: () => void;
  artwork?: ImageSourcePropType;
}

/**
 * თამაშის ფილა მთავარ ეკრანზე.
 * პორტი: `Splash/App/HomeView.swift` (`GameTile`).
 *
 * ვიზუალი:
 * - 3:4 პოსტერის არტვორკი + რეჟიმების კაფსულა (Warm Cream + Deep Purple)
 * - ქვედა დეტალები: Warm Cream (#FAF5E8) ფონი, Deep Purple (#380B70) ტექსტი
 * - წესების მრგვალი "?" ღილაკი Soft Lavender ფონით და Deep Purple სიმბოლოთი
 */
export function GameTile({ game, playerCount = 0, onPlay, onInfo, artwork }: TileProps) {
  const { fontScale } = useWindowDimensions();
  const largeText = fontScale > 1.3;
  const poster = artwork ?? gameArtwork[game.id];
  const modeCount = groupedGames.find((group) => group.id === game.id)?.modes.length ?? (game.id === 'tableread' ? 3 : 0);
  const accent = Colors[game.accent];
  const needsMore = !game.comingSoon && playerCount > 0 && playerCount < game.minPlayers;
  const captionText = gameCaptions[game.id] ?? game.tagline;

  return (
    <View style={styles.tileWrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${game.title}. ${captionText}${modeCount ? `. ${modeCount} რეჟიმი` : ''}`}
        accessibilityHint={needsMore ? `საჭიროა მინიმუმ ${game.minPlayers} მოთამაშე` : 'დასაწყებად დააჭირე'}
        onPress={() => {
          Haptics.medium();
          onPlay();
        }}
        style={styles.tile}
      >
        {/* ── 3:4 პოსტერი ── */}
        <View style={[styles.artwork, { backgroundColor: accent + '14' }]}>
          {poster ? (
            <Image
              source={poster}
              resizeMode="cover"
              style={styles.posterImage}
              accessible={false}
            />
          ) : (
            <View style={{ padding: 16, gap: 14, alignItems: 'center' }}>
              <Icon name={game.icon} size={42} color={accent} />
              <Text style={[body(18, '900'), { color: Colors.textPrimary, textAlign: 'center' }]}>
                {game.title}
              </Text>
            </View>
          )}
        </View>

        {/* ინგლისური სახელი სურათზე უკვე წერია — ქვემოთ მხოლოდ ქართული აღწერა,
            რომ ინგლისურის არმცოდნემაც მაშინვე გაიგოს, რა თამაშია. */}
        <View style={styles.details}>
          <Text
            style={[caption(11, '500'), styles.captionText]}
            numberOfLines={largeText ? undefined : 3}
          >
            {captionText}
          </Text>
        </View>
      </Pressable>

      {/* ── წესების "?" ღილაკი (Soft Lavender circle) ── */}
      {game.howTo.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`წესები — ${game.title}`}
          onPress={() => {
            Haptics.tap();
            onInfo();
          }}
          hitSlop={8}
          style={styles.infoButton}
        >
          <View style={styles.infoCircle}>
            <Text style={styles.infoText}>?</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

export function MiniGameTile(props: TileProps & { size?: 'popular' | 'row' }) {
  const { width } = useWindowDimensions();
  const tileWidth = Math.min(170, Math.max(150, width * 0.42));
  return (
    <View style={{ width: tileWidth }}>
      <GameTile {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  tileWrapper: {
    width: '100%',
    ...Elevation.card,
  },
  tile: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: Radius.tile,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  artwork: {
    width: '100%',
    aspectRatio: 3 / 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#302046',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },

  details: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    // „?“ სურათის კუთხეშია — აღწერა მთელ სიგანეს იყენებს და სამ ხაზამდე ეტევა.
    // სიმაღლე სამ ხაზზეა, რომ რიგში ყველა ფილა ერთნაირი იყოს.
    minHeight: 62,
    justifyContent: 'center',
  },
  captionText: {
    color: Colors.textSecondary,
    lineHeight: 14,
  },
  infoButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    // სურათის თავზე დგას — მუქი ფონი, რომ ნებისმიერ ფერზე იკითხებოდეს.
    backgroundColor: 'rgba(7, 8, 10, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(203, 184, 246, 0.35)',
  },
  infoText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.softLavender,
  },
});
