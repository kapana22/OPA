import React from 'react';
import { StyleSheet, Text, View, Modal, type StyleProp, type ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Space, body, caption, title as titleFont, toTT, glow } from '../theme/theme';
import { icon as sf } from '../theme/icons';
import { Haptics } from '../core/haptics';
import { GamePause } from '../core/ticker';
import { Sound } from '../core/sound';
import { Pressable } from './Pressable';
import { GhostButton } from './Buttons';
import { SplashBackground } from './SplashBackground';
import { useDialog } from './Dialog';

/** პორტი: `Splash/Components/Cards.swift` + `GameExitButton.swift`. */

export function GlassCard({
  padding = 18,
  glowColor,
  glowIntensity = 'soft',
  style,
  children,
}: {
  padding?: number;
  glowColor?: string;
  glowIntensity?: 'soft' | 'medium' | 'strong';
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  return <View style={[styles.card, { padding }, glowColor ? { borderColor: glowColor, ...glow(glowColor, glowIntensity) } : null, style]}>{children}</View>;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  onInfo,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onInfo?: () => void;
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
        <Text style={[titleFont(23), { color: Colors.textPrimary, textTransform: 'uppercase', letterSpacing: 0.6 }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>

      {onInfo ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="თამაშის წესები"
          onPress={() => {
            Haptics.tap();
            onInfo();
          }}
          hitSlop={8}
          style={styles.infoButton}
        >
          <MaterialCommunityIcons name={sf('questionmark')} size={14} color={Colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function SectionLabel({
  text,
  trailing,
  icon,
  accentColor = Colors.phosphor,
}: {
  text: string;
  trailing?: string;
  icon?: string;
  accentColor?: string;
}) {
  return (
    <View style={styles.sectionLabel}>
      {icon ? (
        <MaterialCommunityIcons name={sf(icon)} size={14} color={accentColor} style={{ marginRight: 2 }} />
      ) : null}
      <Text style={[caption(12, '700'), { color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
        {toTT(text)}
      </Text>
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
        // სანამ წყვეტენ, რაუნდი არ უნდა ჩაიწვას დიალოგის უკან.
        GamePause.hold('exit-dialog');
        dialog({
          title: 'თამაშიდან გასვლა?',
          message: 'მიმდინარე რაუნდი დაიკარგება.',
          onClose: () => GamePause.release('exit-dialog'),
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
      // წრე 30px-ია, სამიზნე კი 44pt — თითი ბნელ ოთახში ზუსტად ვერ ხვდება.
      hitSlop={8}
      style={styles.exitButton}
    >
      <MaterialCommunityIcons name={sf('xmark')} size={14} color={Colors.textSecondary} />
    </Pressable>
  );
}

export function ComingSoon({ onBack }: { onBack?: () => void }) {
  return (
    <Notice icon="wrench.and.screwdriver.fill" title="მალე" text="ეს თამაში ჯერ მზადდება. მალე დაბრუნდი." onBack={onBack} />
  );
}

/** სრულეკრანიანი შეტყობინება გამოსასვლელით — ჩიხი ეკრანზე არასდროს უნდა იყოს. */
export function Notice({
  icon,
  title,
  text,
  onBack,
}: {
  icon: string;
  title: string;
  text: string;
  onBack?: () => void;
}) {
  return (
    <View style={styles.comingSoon}>
      <SplashBackground />
      <GlyphIcon name={icon} size={34} tint={Colors.textSecondary} />
      <Text style={[titleFont(28), { color: Colors.textPrimary, marginTop: Space.m }]}>{title}</Text>
      <Text style={[body(16, '500'), { color: Colors.textSecondary, textAlign: 'center', marginTop: Space.xs }]}>
        {text}
      </Text>
      {onBack ? (
        <View style={{ marginTop: Space.l, width: '100%' }}>
          <GhostButton title="უკან" icon="chevron.left" onPress={onBack} />
        </View>
      ) : null}
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
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(203,184,246,0.22)',
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

/**
 * ფილტრის/კატეგორიის ჩიპი. პორტი: `CategoryChip` (`ImpostorSetupView.swift`).
 *
 * `compact` — ერთრიგიანი სეგმენტისთვის (`Layout.segmentRow`): ყველა ჩიპი
 * თანაბარი სიგანისაა და რიგი არ იშლება. მოკლე ვარიანტებს (რიცხვები, წამები,
 * წრეები) სჭირდება — თორემ ხუთიდან მეხუთე მარტო მეორე რიგზე მთელ სიგანეზე
 * იჭიმებოდა.
 */
export function CategoryChip({
  label,
  selected,
  onPress,
  compact = false,
  count,
  remaining,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
  /** რამდენი ჩანაწერია კატეგორიაში — „🍕 საკვები · 56“. */
  count?: number;
  /**
   * კიდევ რამდენი უნახავია. `LOW_FRESH`-ზე ნაკლები → ჩიპი ბაცდება და
   * „· დარჩა 8“ ეწერება: მოთამაშემ იცის, რომ ეს კატეგორია თითქმის ამოწურა.
   */
  remaining?: number | null;
}) {
  const low = typeof remaining === 'number' && remaining < LOW_FRESH;
  const dim = selected ? Colors.onAccent + 'A6' : Colors.textSecondary;
  const a11y = [label, count !== undefined ? `${count} ჩანაწერი` : null, low ? `დარჩა ${remaining}` : null]
    .filter(Boolean)
    .join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ selected }}
      onPress={() => {
        Haptics.tap();
        onPress();
      }}
      style={[
        {
          paddingVertical: 11,
          borderRadius: 14,
          alignItems: 'center',
          backgroundColor: selected ? Colors.phosphor : Colors.surfaceHigh,
          opacity: low && !selected ? 0.6 : 1,
        },
        compact ? { flex: 1, minWidth: 0, paddingHorizontal: 6 } : { flexGrow: 1, minWidth: 68, paddingHorizontal: 10 },
      ]}
    >
      <Text
        style={[body(14, selected ? '900' : '600'), { color: selected ? Colors.onAccent : Colors.textPrimary }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label}
        {count !== undefined ? <Text style={[body(13, '600'), { color: dim }]}>{` · ${count}`}</Text> : null}
        {low ? <Text style={[body(13, '600'), { color: dim }]}>{` · დარჩა ${remaining}`}</Text> : null}
      </Text>
    </Pressable>
  );
}

/** ამაზე ნაკლები უნახავი ჩანაწერი → ჩიპი „თითქმის ამოწურულია“. */
export const LOW_FRESH = 12;

export interface PickerEntry {
  id: string | null;
  label: string;
  count: number;
  /** `null` — ამ ჩანაწერს დასტა არ აქვს (მაგ. კატეგორია სიტყვების გარეშე, სადაც მხოლოდ სახელი ითამაშება). */
  remaining: number | null;
}

/**
 * კატეგორიის ჩიპების რიგი რაოდენობებით.
 *
 * `build` ერთხელ, ეკრანის გახსნისას გამოიძახება — ჩანაწერები საცავიდან
 * იკითხება და ყოველ დაჭერაზე თხუთმეტი დასტის თავიდან დათვლა უაზროა.
 */
export function CategoryPicker({
  build,
  selectedID,
  onSelect,
}: {
  build: () => PickerEntry[];
  selectedID: string | null;
  onSelect: (id: string | null) => void;
}) {
  const entries = React.useMemo(build, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {entries.map((e) => (
        <CategoryChip
          key={e.id ?? '__all'}
          label={e.label}
          count={e.count}
          remaining={e.remaining}
          selected={selectedID === e.id}
          onPress={() => onSelect(e.id)}
        />
      ))}
    </View>
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

export function RulesSheet({
  visible,
  title,
  accent = Colors.phosphor,
  steps,
  onClose,
}: {
  visible: boolean;
  title: string;
  accent?: string;
  steps: string[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>{null}</Pressable>
        <View
          style={{
            backgroundColor: '#1E1231',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            borderWidth: 1,
            borderColor: 'rgba(203,184,246,0.25)',
            paddingTop: 12,
            paddingBottom: 36,
            paddingHorizontal: 22,
            gap: 18,
          }}
        >
          {/* Handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 4 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[titleFont(21), { color: Colors.warmCream, textTransform: 'uppercase', letterSpacing: 0.6 }]}>
              {toTT(title)} · წესები
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="დახურვა"
              onPress={onClose}
              hitSlop={10}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(255,255,255,0.08)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name={sf('xmark')} size={16} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {/* Steps */}
          <View style={{ gap: 12 }}>
            {steps.map((s, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  padding: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: accent,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 1,
                  }}
                >
                  <Text style={[body(12, '900'), { color: Colors.ink }]}>{i + 1}</Text>
                </View>
                <Text style={[body(14, '500'), { color: Colors.textPrimary, flex: 1, lineHeight: 20 }]}>{s}</Text>
              </View>
            ))}
          </View>

          {/* Dismiss button */}
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={{
              backgroundColor: Colors.phosphor,
              paddingVertical: 14,
              borderRadius: Radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 6,
            }}
          >
            <Text style={[body(15, '900'), { color: Colors.ink, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
              {toTT('გასაგებია')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
