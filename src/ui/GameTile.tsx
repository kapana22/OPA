import { Image, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { Colors, Controls, Elevation, Radius, body, caption } from '../theme/theme';
import { type PartyGame } from '../games/types';
import { gameArtwork, gameCaptions } from '../games/artwork';
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
 * 3:4 პოსტერი, მოკლე ქართული აღწერა და წესების ღილაკი.
 */
export function GameTile({ game, playerCount = 0, onPlay, onInfo, artwork }: TileProps) {
  const poster = artwork ?? gameArtwork[game.id];
  const accent = Colors[game.accent];
  const needsMore = !game.comingSoon && playerCount > 0 && playerCount < game.minPlayers;
  const captionText = gameCaptions[game.id] ?? game.tagline;

  return (
    <View style={styles.tileWrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${game.title}. ${captionText}`}
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
          <Text style={[caption(12, '500'), styles.captionText]}>
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
          style={styles.infoButton}
        >
          <View style={styles.infoCircle}>
            <Icon name="questionmark" size={16} weight="bold" color={Colors.softLavender} />
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
    <View style={{ width: tileWidth, flexGrow: 1 }}>
      <GameTile {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  tileWrapper: {
    width: '100%',
    flexGrow: 1,
    ...Elevation.card,
  },
  tile: {
    width: '100%',
    flexGrow: 1,
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
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    // Two lines by default; longer or enlarged text grows without truncation.
    // Stretch remaining space so cards in the same row share a bottom edge.
    minHeight: 56,
    flexGrow: 1,
    justifyContent: 'center',
  },
  captionText: {
    color: Colors.textSecondary,
    lineHeight: 17,
    textAlign: 'center',
  },
  infoButton: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: Controls.icon.size,
    height: Controls.icon.size,
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
});
