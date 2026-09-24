import { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoster } from '../state/state';
import { Colors, Radius, body, title, toTT } from '../theme/theme';
import { PLAYER_CHARACTERS } from './playerCharacters';
import { Pressable } from './Pressable';
import { GhostButton } from './Buttons';
import { Haptics } from '../core/haptics';
import type { PlayerGender } from '../core/characters';

type FilterType = 'all' | PlayerGender;

export function CharacterPicker({ playerID, onClose }: { playerID: string | null; onClose: () => void }) {
  const roster = useRoster();
  const insets = useSafeAreaInsets();
  const player = roster.players.find(p => p.id === playerID);
  const [filter, setFilter] = useState<FilterType>('all');

  // სხვა მოთამაშე ან სქესი შეიცვალა — ფილტრი მას მიჰყვება.
  const filterKey = `${playerID}:${player?.gender ?? ''}`;
  const [seenFilterKey, setSeenFilterKey] = useState(filterKey);
  if (seenFilterKey !== filterKey) {
    setSeenFilterKey(filterKey);
    setFilter(player?.gender ?? 'all');
  }

  const items = PLAYER_CHARACTERS.map((character, id) => ({ character, id })).filter(
    ({ character }) => filter === 'all' || character.gender === filter
  );

  return (
    <Modal visible={!!player} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.header}>
          <Text style={[title(22), { color: Colors.textPrimary }]}>
            {player?.name} — {toTT('პერსონაჟი')}
          </Text>
          <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>
            დაკავებულს თუ აირჩევ, პერსონაჟებს გაცვლით.
          </Text>
        </View>

        {/* Filter Segment Tabs */}
        <View style={styles.filterRow}>
          {(
            [
              { key: 'all', label: 'ყველა' },
              { key: 'boy', label: '👦 ბიჭები' },
              { key: 'girl', label: '👧 გოგოები' },
            ] as const
          ).map((tab) => {
            const active = filter === tab.key;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                onPress={() => {
                  Haptics.tap();
                  setFilter(tab.key);
                }}
                style={[styles.filterTab, active && styles.filterTabActive]}
              >
                <Text
                  style={[
                    body(12, '700'),
                    { color: active ? Colors.onAccent : Colors.textPrimary, letterSpacing: 0.3 },
                  ]}
                >
                  {toTT(tab.label)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.grid}>
          {items.map(({ character, id }) => {
            const owner = roster.players.find((p) => p.characterID === id);
            const selected = player?.characterID === id;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${character.name}${owner ? ` — ${owner.name}` : ' — თავისუფალია'}`}
                onPress={() => {
                  if (player) roster.setCharacter(player.id, id);
                  onClose();
                }}
                style={[
                  styles.card,
                  selected && styles.cardSelected,
                ]}
              >
                <View style={styles.genderPill}>
                  <Text style={{ fontSize: 11 }}>{character.gender === 'girl' ? '👧' : '👦'}</Text>
                </View>
                <Image source={character.image} resizeMode="contain" style={styles.cardImage} accessible={false} />
                <Text style={[body(11, '700'), { color: selected ? Colors.phosphor : Colors.textPrimary, textAlign: 'center' }]}>
                  {character.name}
                </Text>
                <Text
                  style={[
                    body(10, '600'),
                    { color: owner ? Colors.textSecondary : Colors.phosphor, textAlign: 'center' },
                  ]}
                  numberOfLines={1}
                >
                  {owner ? (owner.id === player?.id ? 'არჩეულია' : owner.name) : 'თავისუფალია'}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <GhostButton title="დახურვა" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#080410FA',
    paddingHorizontal: 20,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 3,
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: Colors.stroke,
    gap: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small - 3,
  },
  filterTabActive: {
    backgroundColor: Colors.phosphor,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: 4,
  },
  card: {
    width: '31%',
    padding: 8,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.stroke,
    gap: 4,
    position: 'relative',
    alignItems: 'center',
  },
  cardSelected: {
    borderColor: Colors.phosphor,
    backgroundColor: 'rgba(198, 255, 0, 0.08)',
  },
  genderPill: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 2,
    zIndex: 2,
  },
  cardImage: {
    width: '100%',
    height: 110,
  },
});