import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Space, body } from '../theme/theme';
import type { Player } from '../core/roster';

export interface Award {
  /** მოკლე სათაური — „ტელეფონის მაგნიტი“. */
  title: string;
  /** ვინ დაიმსახურა; ცარიელი სია = ჯილდო არ გაიცემა. */
  players: Player[];
  /** ერთი ხაზი, რომელიც ხსნის, რატომ. */
  note?: string;
  tint?: string;
}

/**
 * შეჯამების ჯილდოები — პოდიუმის ქვემოთ, ტაბლოს გარდა.
 *
 * ტაბლო მხოლოდ ერთ კითხვას პასუხობს: ვინ მოიგო. ჯილდოები კი იმას იხსენებენ,
 * რაც მაგიდას ისედაც ახსოვს — ვინ იყო ყოველ კითხვაზე პასუხი და ვისზე
 * არავის უფიქრია. სწორედ ეს ამბები რჩება საღამოს შემდეგ.
 *
 * ცარიელი ჯილდო არ ჩანს: „ვერავინ დაიმსახურა“ უარესია, ვიდრე მისი არარსებობა.
 */
export function SummaryAwards({ awards }: { awards: Award[] }) {
  const earned = awards.filter((a) => a.players.length > 0);
  if (earned.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {earned.map((award) => (
        <View key={award.title} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: award.tint ?? Colors.phosphor }]} />
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={[body(13, '700'), { color: award.tint ?? Colors.phosphor }]}>{award.title}</Text>
            <Text style={[body(14, '600'), { color: Colors.textPrimary }]} numberOfLines={2}>
              {award.players.map((p) => p.name).join(', ')}
            </Text>
            {award.note ? (
              <Text style={[body(11, '500'), { color: Colors.textSecondary }]}>{award.note}</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, paddingHorizontal: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: Radius.default,
    paddingVertical: 10,
    paddingHorizontal: Space.m,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
