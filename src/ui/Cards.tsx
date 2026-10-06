import React from 'react';
import { ALL_ORIENTATIONS } from './modalOrientations';
import { StyleSheet, Text, View, Modal, ScrollView, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { Colors, Controls, Radius, Space, body, caption, title as titleFont, toTT, glow } from '../theme/theme';
import { Haptics } from '../core/haptics';
import { GamePause } from '../core/ticker';
import { Sound } from '../core/sound';
import { Pressable } from './Pressable';
import { GhostButton, IconButton, PrimaryButton } from './Buttons';
import { SplashBackground } from './SplashBackground';
import { useDialog } from './Dialog';
import { Icon } from './Icon';
import { categoryPresentation } from './categoryPresentation';
import { needsSingleColumn } from '../theme/responsive';

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
        <IconButton label="უკან" icon="chevron.left" onPress={onBack} />
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
        <IconButton label="თამაშის წესები" icon="questionmark" onPress={onInfo} />
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
        <Icon name={icon} size={14} color={accentColor} style={{ marginRight: 2 }} />
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
      <Icon name={name} size={size} color={tint} weight="regular" />
    </View>
  );
}

/** თამაშიდან გასვლა დადასტურებით — მიმდინარე რაუნდი იკარგება. */
export function GameExitButton({ onExit }: { onExit: () => void }) {
  const dialog = useDialog();
  return (
    <IconButton
      label="თამაშიდან გასვლა"
      icon="xmark"
      onPress={() => {
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
    />
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
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6 },
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
  const { width, fontScale } = useWindowDimensions();
  const wrapCompact = needsSingleColumn(width, fontScale);
  const dim = selected ? Colors.onAccent + 'A6' : Colors.textSecondary;
  const a11y = [label, count !== undefined ? `${count} ჩანაწერი` : null, low ? `დარჩა ${remaining}` : null]
    .filter(Boolean)
    .join(', ');
  const presentation = categoryPresentation(label);
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
          minHeight: Controls.compact.minHeight,
          paddingVertical: Controls.compact.paddingVertical,
          borderRadius: Controls.compact.radius,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: selected ? Colors.phosphor : Colors.surfaceHigh,
          opacity: low && !selected ? 0.6 : 1,
        },
        compact ? { flexGrow: 1, flexBasis: wrapCompact ? '42%' : 0, minWidth: 0, paddingHorizontal: 6 } : { flexGrow: 1, minWidth: 68, paddingHorizontal: 10 },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      {presentation.icon && !compact ? <Icon name={presentation.icon} size={18} weight="regular" color={selected ? Colors.onAccent : Colors.textSecondary} /> : null}
      <Text
        style={[body(14, selected ? '700' : '600'), { color: selected ? Colors.onAccent : Colors.textPrimary, textAlign: 'center', flexShrink: 1 }]}
      >
        {presentation.title}
        {count !== undefined ? <Text style={[body(13, '600'), { color: dim }]}>{` · ${count}`}</Text> : null}
        {low ? <Text style={[body(13, '600'), { color: dim }]}>{` · დარჩა ${remaining}`}</Text> : null}
      </Text>
      </View>
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
 * კატეგორიების ჩამონათვალი — რამდენიმე კატეგორია ერთად ირჩევა.
 * არცერთი მონიშნული = „ყველა“. `build`-ის „ყველა“ ჩანაწერი (`id: null`)
 * ზემოთ ცალკე ღილაკად ჩნდება, დანარჩენი ორ სვეტად.
 */
export function CategoryChecklist({
  build,
  selectedIDs,
  onChange,
}: {
  build: () => PickerEntry[];
  selectedIDs: readonly string[];
  onChange: (ids: string[]) => void;
}) {
  // ერთხელ, გახსნისას — რიგი თამაშის შუაში არ უნდა ხტოდეს.
  const { width, fontScale } = useWindowDimensions();
  const singleColumn = needsSingleColumn(width, fontScale);
  const entries = React.useMemo(() => build(), []); // eslint-disable-line react-hooks/exhaustive-deps
  const all = entries.find((e) => e.id === null);
  const cats = entries.filter((e): e is PickerEntry & { id: string } => e.id !== null);
  const chosen = new Set(selectedIDs.filter((id) => cats.some((c) => c.id === id)));
  const isAll = chosen.size === 0;

  const toggle = (id: string) => {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    // ყველა მონიშნული = „ყველა“: სია სუფთა რჩება.
    onChange(next.size === cats.length ? [] : cats.filter((c) => next.has(c.id)).map((c) => c.id));
  };

  return (
    <View style={{ gap: 8 }}>
      <CheckTile
        label={all?.label ?? 'ყველა'}
        count={all?.count}
        checked={isAll}
        fullWidth
        onPress={() => onChange([])}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
        {cats.map((c) => (
          <View key={c.id} style={{ width: singleColumn ? '100%' : '48%' }}>
            <CheckTile label={c.label} count={c.count} checked={chosen.has(c.id)} onPress={() => toggle(c.id)} />
          </View>
        ))}
      </View>
    </View>
  );
}

function CheckTile({ label, count, checked, onPress, fullWidth = false }: { label: string; count?: number; checked: boolean; onPress: () => void; fullWidth?: boolean }) {
  const presentation = categoryPresentation(label);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={count !== undefined ? `${label}, ${count} ჩანაწერი` : label}
      accessibilityState={{ checked }}
      onPress={() => {
        Haptics.tap();
        onPress();
      }}
      style={{
        flexDirection: fullWidth ? 'row' : 'column',
        alignItems: fullWidth ? 'center' : 'stretch',
        gap: 8,
        minHeight: fullWidth ? 48 : 98,
        flex: fullWidth ? undefined : 1,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: Controls.compact.radius,
        borderWidth: 1.5,
        borderColor: checked ? Colors.phosphor : 'transparent',
        backgroundColor: Colors.surfaceHigh,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      {!fullWidth && presentation.icon ? <Icon name={presentation.icon} size={20} weight="regular" color={Colors.textSecondary} /> : null}
      <Icon
        name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
        size={18}
        color={checked ? Colors.phosphor : Colors.textSecondary}
      />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[body(14, '600'), { color: Colors.textPrimary }]}>
          {presentation.title}
        </Text>
      </View>
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
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: Controls.compact.minHeight }}
    >
      <Icon
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

/** შედეგის რიგი — ადგილი, სახელი, ქულა. */
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
      <Icon
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
        <Icon name="minus" size={18} color={Colors.textPrimary} />
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
        <Icon name="plus" size={18} color={Colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  button: {
    width: Controls.icon.size,
    height: Controls.icon.size,
    borderRadius: Controls.icon.radius,
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
    <Modal supportedOrientations={ALL_ORIENTATIONS} visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' }}>
        <Pressable animate={false} style={StyleSheet.absoluteFill} onPress={onClose}>{null}</Pressable>
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
            maxHeight: '90%',
          }}
        >
          {/* Handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 4 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[titleFont(18), { color: Colors.warmCream, flex: 1, marginRight: 12 }]}>
              {toTT(title)} · წესები
            </Text>
            <IconButton label="დახურვა" icon="xmark" onPress={onClose} />
          </View>

          {/* Steps */}
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 16 }}>
            {steps.map((s, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: Colors.phosphor,
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
          </ScrollView>

          {/* Dismiss button */}
          <PrimaryButton title="გასაგებია" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}
