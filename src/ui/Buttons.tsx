import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, body } from '../theme/theme';
import { icon as sf } from '../theme/icons';
import { Haptics } from '../core/haptics';
import { Pressable } from './Pressable';

/**
 * პორტი: `Splash/Components/Buttons.swift`.
 *
 * აიქონი დეკორატიულია — ხმოვან წამკითხველს მხოლოდ სათაური უნდა წაუკითხოს,
 * თორემ სიმბოლოს სახელსაც დაამატებდა.
 */

export function PrimaryButton({
  title,
  icon,
  tint = Colors.neonCyan,
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
        if (!enabled) return;
        Haptics.medium();
        onPress();
      }}
      style={[
        styles.primary,
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
