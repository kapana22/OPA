import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Space, body, caption, title as titleFont } from '../theme/theme';
import { icon as sf } from '../theme/icons';
import { Haptics } from '../core/haptics';
import { Sound } from '../core/sound';
import { Pressable } from './Pressable';
import { SplashBackground } from './SplashBackground';
import { useDialog } from './Dialog';

/** პორტი: `Splash/Components/Cards.swift` + `GameExitButton.swift`. */

export function GlassCard({
  padding = 18,
  style,
  children,
}: {
  padding?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return <View style={[styles.card, { padding }, style]}>{children}</View>;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="უკან"
          onPress={() => {
            Haptics.tap();
            onBack();
          }}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name={sf('chevron.left')} size={19} color={Colors.textPrimary} />
        </Pressable>
      ) : null}

      <View style={styles.headerText}>
        <Text style={[titleFont(25), { color: Colors.textPrimary }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function SectionLabel({ text, trailing }: { text: string; trailing?: string }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={[caption(12), { color: Colors.textSecondary }]}>{text}</Text>
      <View style={{ flex: 1 }} />
      {trailing ? (
        <Text style={[caption(12), { color: Colors.textSecondary, opacity: 0.7 }]}>{trailing}</Text>
      ) : null}
    </View>
  );
}

/** აიქონი ფერად კვადრატში — SF Symbol-ის სახელით, როგორც Swift-ში. */
export function GlyphIcon({
  name,
  size = 34,
  tint = Colors.phosphor,
}: {
  name: string;
  size?: number;
  tint?: string;
}) {
  const box = size * 2.1;
  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: size * 0.62,
        backgroundColor: tint + '1F', // ~12% გამჭვირვალობა
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons name={sf(name)} size={size} color={tint} />
    </View>
  );
}

/** თამაშიდან გასვლა დადასტურებით — მიმდინარე რაუნდი იკარგება. */
export function GameExitButton({ onExit }: { onExit: () => void }) {
  const dialog = useDialog();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="თამაშიდან გასვლა"
      onPress={() => {
        Haptics.tap();
        dialog({
          title: 'თამაშიდან გასვლა?',
          message: 'მიმდინარე რაუნდი დაიკარგება.',
          actions: [
            { label: 'გაგრძელება' },
            {
              label: 'გასვლა',
              primary: true,
              destructive: true,
              onPress: () => {
                Sound.stop();
                onExit();
              },
            },
          ],
        });
      }}
      style={styles.exitButton}
    >
      <MaterialCommunityIcons name={sf('xmark')} size={14} color={Colors.textSecondary} />
    </Pressable>
  );
}

export function ComingSoon() {
  return (
    <View style={styles.comingSoon}>
      <SplashBackground />
      <GlyphIcon name="wrench.and.screwdriver.fill" size={34} tint={Colors.textSecondary} />
      <Text style={[titleFont(28), { color: Colors.textPrimary, marginTop: Space.m }]}>მალე</Text>
      <Text style={[body(16, '500'), { color: Colors.textSecondary, textAlign: 'center', marginTop: Space.xs }]}>
        ეს თამაში ჯერ მზადდება. მალე დაბრუნდი.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.default, backgroundColor: Colors.surface, width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, gap: 1 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6 },
  exitButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoon: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Space.l },
});

/** ფილტრის/კატეგორიის ჩიპი. პორტი: `CategoryChip` (`ImpostorSetupView.swift`). */
export function CategoryChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        Haptics.tap();
        onPress();
      }}
      style={{
        flexGrow: 1,
        minWidth: 68,
        paddingVertical: 11,
        paddingHorizontal: 10,
        borderRadius: 14,
        alignItems: 'center',
        backgroundColor: selected ? Colors.phosphor : Colors.surfaceHigh,
      }}
    >
      <Text
        style={[body(14, selected ? '900' : '600'), { color: selected ? Colors.onAccent : Colors.textPrimary }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** არჩევანის რიგი წრიული ნიშნით — რეჟიმის ასარჩევად. */
export function RadioRow({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        Haptics.tap();
        onPress();
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      <MaterialCommunityIcons
        name={selected ? 'radiobox-marked' : 'radiobox-blank'}
        size={21}
        color={selected ? Colors.neonCyan : Colors.textSecondary}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[body(15, '700'), { color: Colors.textPrimary }]}>{title}</Text>
        <Text style={[body(12, '500'), { color: Colors.textSecondary }]}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

/** ტაბლოს რიგი — ადგილი, სახელი, ქულა. */
export function RankRow({
  rank,
  name,
  score,
  highlight,
}: {
  rank: number;
  name: string;
  score: number;
  highlight?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: Space.m,
        paddingVertical: 13,
        borderRadius: Radius.small,
        backgroundColor: highlight ? Colors.phosphor + '29' : Colors.surface,
      }}
    >
      <Text style={[body(16, '900'), { color: Colors.textSecondary, width: 30 }]}>{rank}</Text>
      <Text style={[body(16, '600'), { color: Colors.textPrimary, flex: 1 }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[titleFont(20), { color: highlight ? Colors.phosphor : Colors.textPrimary, fontVariant: ['tabular-nums'] }]}>
        {score}
      </Text>
    </View>
  );
}

/** ჩამრთველის რიგი — სათაური, ახსნა და გადამრთველი. */
export function ToggleRow({
  title,
  subtitle,
  value,
  onChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityState={{ checked: value }}
      onPress={() => {
        Haptics.tap();
        onChange(!value);
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[body(15, '700'), { color: Colors.textPrimary }]}>{title}</Text>
        <Text style={[caption(12), { color: Colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <MaterialCommunityIcons
        name={value ? 'toggle-switch' : 'toggle-switch-off-outline'}
        size={34}
        color={value ? Colors.phosphor : Colors.textSecondary}
      />
    </Pressable>
  );
}

/** ციფრის მომატება-მოკლება — `Stepper`-ის შემცვლელი. */
export function Stepper({
  value,
  min,
  max,
  tint = Colors.phosphor,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  tint?: string;
  onChange: (v: number) => void;
}) {
  const step = (delta: number) => {
    const next = Math.min(Math.max(min, value + delta), max);
    if (next === value) return;
    Haptics.tap();
    onChange(next);
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="შემცირება"
        accessibilityState={{ disabled: value <= min }}
        disabled={value <= min}
        onPress={() => step(-1)}
        style={[stepperStyles.button, { opacity: value <= min ? 0.35 : 1 }]}
      >
        <MaterialCommunityIcons name="minus" size={18} color={Colors.textPrimary} />
      </Pressable>

      <Text style={[titleFont(22), { color: tint, minWidth: 28, textAlign: 'center', fontVariant: ['tabular-nums'] }]}>
        {value}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="გაზრდა"
        accessibilityState={{ disabled: value >= max }}
        disabled={value >= max}
        onPress={() => step(1)}
        style={[stepperStyles.button, { opacity: value >= max ? 0.35 : 1 }]}
      >
        <MaterialCommunityIcons name="plus" size={18} color={Colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceHigh,
  },
});

/** თხელი გამყოფი ხაზი ბარათის შიგნით. */
export function Divider() {
  return <View style={{ height: 1, backgroundColor: Colors.stroke }} />;
}
