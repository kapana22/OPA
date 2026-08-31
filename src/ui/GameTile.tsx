import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, body, caption } from '../theme/theme';
import { icon as sf } from '../theme/icons';
import { energyIcon, energyTitle, type PartyGame } from '../games/types';
import { Haptics } from '../core/haptics';
import { Pressable } from './Pressable';

/**
 * მთავარი ეკრანის ფილა.
 *
 * პორტი: `GameTile` (`Splash/App/HomeView.swift`).
 *
 * მეტა-ზოლში „რამდენი წუთია“ და „ხმაურიანია თუ არა“ დგას — ღამის ერთზე
 * არჩევანს ხშირად სწორედ ეს ორი წყვეტს, არა ჟანრი. მოთამაშეთა დიაპაზონი
 * მხოლოდ მაშინ ჩანს, როცა რამეს ამბობს.
 */
export function GameTile({
  game,
  playerCount = 0,
  onPlay,
  onInfo,
}: {
  game: PartyGame;
  playerCount?: number;
  onPlay: () => void;
  onInfo: () => void;
}) {
  const accent = Colors[game.accent];
  const needsMorePlayers = !game.comingSoon && playerCount > 0 && playerCount < game.minPlayers;
  const showRange = needsMorePlayers || playerCount === 0;
  const titleColor = game.comingSoon ? Colors.textSecondary : Colors.textPrimary;

  const a11y = [
    game.title,
    game.tagline,
    `${game.minPlayers}-დან ${game.maxPlayers} მოთამაშემდე`,
    `დაახლოებით ${game.minutes} წუთი`,
    energyTitle[game.energy],
  ].join('. ');

  return (
    <View style={{ flex: 1 }}>
      <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityHint={needsMorePlayers ? `საჭიროა მინიმუმ ${game.minPlayers} მოთამაშე` : 'დასაწყებად დააჭირე'}
      onPress={() => {
        Haptics.medium();
        onPlay();
      }}
      style={[
        styles.tile,
        { borderColor: game.comingSoon ? Colors.stroke : accent + '38' },
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: game.comingSoon ? Colors.surfaceHigh : accent + '1F' },
          ]}
        >
          <MaterialCommunityIcons
            name={sf(game.icon)}
            size={21}
            color={game.comingSoon ? Colors.textSecondary : accent}
          />
        </View>
        <View style={{ flex: 1 }} />
      </View>

      <View style={{ flex: 1, minHeight: 10 }} />

      <Text style={[body(18, '900'), { color: titleColor }]} numberOfLines={2} adjustsFontSizeToFit>
        {game.title}
      </Text>

      <View style={styles.metaRow}>
        {showRange ? (
          <>
            <MaterialCommunityIcons
              name={sf(needsMorePlayers ? 'person.badge.plus' : 'person.2.fill')}
              size={10}
              color={needsMorePlayers ? accent : Colors.textSecondary}
            />
            <Text style={[caption(11), { color: needsMorePlayers ? accent : Colors.textSecondary }]}>
              {needsMorePlayers ? `საჭიროა ${game.minPlayers}+` : `${game.minPlayers}–${game.maxPlayers}`}
            </Text>
            <Text style={[caption(11), { color: Colors.textSecondary, opacity: 0.6 }]}>·</Text>
          </>
        ) : null}

        <MaterialCommunityIcons name={sf('clock')} size={10} color={Colors.textSecondary} />
        <Text style={[caption(11), { color: Colors.textSecondary }]}>{game.minutes} წთ</Text>
        <MaterialCommunityIcons
          name={sf(energyIcon[game.energy])}
          size={10}
          color={game.energy === 'loud' ? accent : Colors.textSecondary}
        />
      </View>
      </Pressable>

      {/* წესების ღილაკი ცალკე ფენაა, არა ფილის შიგნით — ჩალაგებული ღილაკი
          ხელმისაწვდომობასაც ტეხს და web-ზე არასწორი HTML-იც არის. */}
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
          <Text style={[caption(12), { color: Colors.textSecondary, fontWeight: '900' }]}>?</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 140,
    padding: 14,
    borderRadius: Radius.tile,
    backgroundColor: Colors.surface,
    borderWidth: 1,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  infoButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
});
