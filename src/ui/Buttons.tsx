import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Controls, body } from '../theme/theme';
import { Haptics } from '../core/haptics';
import { Pressable } from './Pressable';
import { Icon } from './Icon';

/**
 * პორტი: `Splash/Components/Buttons.swift`.
 *
 * ტექსტური მოქმედებები სადაა; აიქონები მხოლოდ ნავიგაციასა და არჩევანს აქვს.
 * `icon` ძველი Flow-ების თავსებადობისთვის რჩება, მაგრამ ტექსტურ ღილაკზე არ ჩანს.
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
/**
 * ახლად გაჩენილი ღილაკი პირველ წამებში შეხებას არ იღებს: ორმაგი დაჭერის
 * მეორე შეხება 400 მწ-ზე გვიან რომ მოვიდეს, შემდეგი ეკრანის იმავე ადგილას
 * მდგომ ღილაკს მაინც აღარ დააჭერს.
 */
const MOUNT_GUARD_MS = 600;
let lastPressAt = 0;
function acceptPress(mountedAt: number): boolean {
  const now = Date.now();
  if (now - mountedAt < MOUNT_GUARD_MS) return false;
  if (now - lastPressAt < PRESS_GUARD_MS) return false;
  lastPressAt = now;
  return true;
}

function useMountedAt(): { current: number } {
  const mountedAt = useRef(Number.MAX_SAFE_INTEGER);
  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);
  return mountedAt;
}

export function PrimaryButton({
  title,
  enabled = true,
  onPress,
}: {
  title: string;
  icon?: string;
  /** ძველი Flow-ების თავსებადობა; მოქმედების ფერი ყოველთვის ბრენდის ლაიმია. */
  tint?: string;
  enabled?: boolean;
  onPress: () => void;
}) {
  const mountedAt = useMountedAt();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={() => {
        if (!enabled || !acceptPress(mountedAt.current)) return;
        Haptics.medium();
        onPress();
      }}
      style={[styles.action, styles.primary, !enabled && styles.disabled]}
    >
      <View style={styles.row}>
        <Text style={[body(Controls.action.fontSize, '700'), styles.label, { color: enabled ? Controls.primaryForeground : Colors.textSecondary }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

export function GhostButton({ title, onPress, enabled = true }: { title: string; icon?: string; onPress: () => void; enabled?: boolean }) {
  const mountedAt = useMountedAt();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={() => {
        if (!enabled || !acceptPress(mountedAt.current)) return;
        Haptics.tap();
        onPress();
      }}
      style={[styles.action, styles.secondary]}
    >
      <View style={styles.row}>
        <Text style={[body(Controls.action.fontSize, '700'), styles.label, { color: enabled ? Controls.secondaryForeground : Colors.textSecondary }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

/** პატარა ტექსტური მოქმედება: პარამეტრები, გადარევა, დამატებითი არჩევანი. */
export function CompactButton({ title, onPress, enabled = true }: { title: string; icon?: string; onPress: () => void; enabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: !enabled }} disabled={!enabled}
      onPress={() => { Haptics.tap(); onPress(); }} style={[styles.compact, styles.secondary]}>
      <View style={styles.row}>
        <Text style={[body(Controls.compact.fontSize, '700'), styles.label, { color: enabled ? Colors.textPrimary : Colors.textSecondary }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

/** უკან, დახურვა და დახმარება ერთ ზომასა და ვიზუალურ სტილში. */
export function IconButton({ label, icon, onPress, active = false }: { label: string; icon: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      onPress={() => { Haptics.tap(); onPress(); }} style={[styles.iconButton, active && styles.primary]}>
      <Icon name={icon} size={Controls.icon.glyphSize} weight="bold" color={active ? Controls.primaryForeground : Colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    minHeight: Controls.action.minHeight,
    borderRadius: Controls.action.radius,
    paddingVertical: Controls.action.paddingVertical,
    paddingHorizontal: Controls.action.paddingHorizontal,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: Controls.primaryBackground, borderColor: Controls.primaryBackground },
  disabled: { backgroundColor: Controls.secondaryBackground, borderColor: Controls.border },
  secondary: { backgroundColor: Controls.secondaryBackground, borderColor: Controls.border },
  compact: {
    minHeight: Controls.compact.minHeight,
    borderRadius: Controls.compact.radius,
    paddingVertical: Controls.compact.paddingVertical,
    paddingHorizontal: Controls.compact.paddingHorizontal,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: Controls.icon.size,
    height: Controls.icon.size,
    borderRadius: Controls.icon.radius,
    backgroundColor: Controls.secondaryBackground,
    borderWidth: 1,
    borderColor: Controls.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Controls.gap, maxWidth: '100%' },
  label: { flexShrink: 1, textAlign: 'center' },
});
