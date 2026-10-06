import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, body, caption } from '../theme/theme';
import { Pressable } from './Pressable';
import { Layout } from './layout';
import { Haptics } from '../core/haptics';
import type { Player } from '../core/roster';

/** „ვინ იხდის?“ — სახელების ჩართვა-გამორთვა; ბარათის ჯარიმაც და წესის დარღვევაც ამას იყენებს. */
export function ChargePicker({
  players,
  charged,
  setCharged,
  label = 'ვინ იხდის? შეეხე სახელს',
  tint = Colors.neonMagenta,
}: {
  label?: string;
  tint?: string;
  players: readonly Player[];
  charged: Set<string>;
  setCharged: (update: (prev: Set<string>) => Set<string>) => void;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[caption(11), Layout.centered, { color: Colors.textSecondary }]}>
        {label}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {players.map((player) => {
          const on = charged.has(player.id);
          return (
            <Pressable
              key={player.id}
              accessibilityRole="button"
              accessibilityLabel={player.name}
              accessibilityState={{ selected: on }}
              onPress={() => {
                Haptics.tap();
                setCharged((prev) => {
                  const next = new Set(prev);
                  if (on) next.delete(player.id);
                  else next.add(player.id);
                  return next;
                });
              }}
              style={[styles.nameChip, { backgroundColor: on ? tint : Colors.surface }]}
            >
              <Text style={[body(13, '700'), { color: on ? Colors.ink : Colors.textPrimary }]} numberOfLines={1}>
                {player.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  nameChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999 },
});
