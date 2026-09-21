import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, body, glow } from '../theme/theme';
import { icon as sf } from '../theme/icons';
import { Haptics } from '../core/haptics';
import { Pressable } from './Pressable';

/**
 * პორტი: `Splash/Components/Buttons.swift`.
 *
 * აიქონი დეკორატიულია — ხმოვან წამკითხველს მხოლოდ სათაური უნდა წაუკითხოს,
 * თორემ სიმბოლოს სახელსაც დაამატებდა.
 */

/**
 * ორმაგი დაჭერის დაცვა — **ყველა** ღილაკზე საერთო.
 *
 * შემდეგი ეკრანის ღილაკი ხშირად იმავე ადგილას ჩნდება, ამიტომ სწრაფი მეორე
 * შეხება უკვე **ახალ** ღილაკზე ეცემოდა: შემდეგი მოთამაშის ფარული ეკრანი
 * იხსნებოდა, ბარათი წაუკითხავად მიიღებოდა, რაუნდი გამოტოვდებოდა. ძრავის ფაზის
 * შემოწმება ამას ვერ იჭერს — მეორე დაჭერა უკვე სწორ ფაზაშია.
 */
const PRESS_GUARD_MS = 400;
let lastPressAt = 0;
function acceptPress(): boolean {
  const now = Date.now();
  if (now - lastPressAt < PRESS_GUARD_MS) return false;
  lastPressAt = now;
  return true;
}

export function PrimaryButton({
  title,
  icon,
  tint = Colors.phosphor,
  enabled = true,
  onPress,
}: {
  title: string;
  icon?: string;
  tint?: string;
  enabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={() => {
        if (!enabled || !acceptPress()) return;
        Haptics.medium();
        onPress();
      }}
      style={[
        styles.primary,
        enabled ? { ...glow(tint, 'medium'), borderWidth: 1, borderColor: tint } : null,
        { backgroundColor: enabled ? tint : Colors.surfaceHigh, opacity: enabled ? 1 : 0.6 },
      ]}
    >
      <View style={styles.row}>
        {icon ? (
          <MaterialCommunityIcons
            name={sf(icon)}
            size={19}
            color={enabled ? Colors.onAccent : Colors.textSecondary}
            accessible={false}
          />
        ) : null}
        <Text style={[body(18, '800'), { color: enabled ? Colors.onAccent : Colors.textSecondary }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

export function GhostButton({ title, icon, onPress }: { title: string; icon?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        if (!acceptPress()) return;
        Haptics.tap();
        onPress();
      }}
      style={styles.ghost}
    >
      <View style={styles.rowTight}>
        {icon ? <MaterialCommunityIcons name={sf(icon)} size={17} color={Colors.textPrimary} accessible={false} /> : null}
        <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    borderRadius: Radius.default,
    paddingVertical: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: {
    borderRadius: Radius.default,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
