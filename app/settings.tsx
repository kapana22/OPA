import React, { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Space, body, caption, title as titleFont } from '../src/theme/theme';
import { icon as sf } from '../src/theme/icons';
import { SplashBackground } from '../src/ui/SplashBackground';
import { GlassCard } from '../src/ui/Cards';
import { PrimaryButton } from '../src/ui/Buttons';
import { Pressable } from '../src/ui/Pressable';
import { Sound } from '../src/core/sound';
import { Haptics } from '../src/core/haptics';
import { ContentShoe } from '../src/core/contentShoe';
import { useDialog } from '../src/ui/Dialog';

/** პორტი: `Splash/App/SettingsView.swift`. */
export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [soundOn, setSoundOn] = useState(Sound.isEnabled);
  const [hapticsOn, setHapticsOn] = useState(Haptics.isEnabled);
  const [didReset, setDidReset] = useState(false);
  const dialog = useDialog();

  const toggleSound = (value: boolean) => {
    setSoundOn(value);
    Sound.setEnabled(value);
    if (value) Sound.play('tick');
  };

  const toggleHaptics = (value: boolean) => {
    setHapticsOn(value);
    Haptics.setEnabled(value);
    if (value) Haptics.medium();
  };

  const askReset = () => {
    Haptics.tap();
    dialog({
      title: 'კონტენტის მეხსიერება განულდეს?',
      message:
        'აპს ახსოვს, რომელი სიტყვები და კითხვები უკვე ითამაშეთ — ამიტომ ისინი მალე არ მეორდება. განულების შემდეგ ყველა კატეგორია თავიდან იწყება.',
      actions: [
        {
          label: 'განულება',
          primary: true,
          destructive: true,
          onPress: () => {
            ContentShoe.forgetAll();
            setDidReset(true);
            Haptics.success();
          },
        },
        { label: 'გაუქმება' },
      ],
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <SplashBackground tint={Colors.phosphor} />
      <View style={{ flex: 1, paddingTop: insets.top + Space.m, paddingHorizontal: 20, gap: 14 }}>
        <Text style={[titleFont(24), { color: Colors.textPrimary, textAlign: 'center' }]}>პარამეტრები</Text>

        <GlassCard>
          <View style={{ gap: Space.m }}>
            <ToggleRow
              title="ხმა"
              subtitle="ტაიმერის ტკაცუნი, აფეთქება, გამარჯვება"
              value={soundOn}
              onChange={toggleSound}
            />
            <View style={styles.divider} />
            <ToggleRow
              title="ვიბრაცია"
              subtitle="ყოველი შეხება და რაუნდის დასასრული"
              value={hapticsOn}
              onChange={toggleHaptics}
            />
          </View>
        </GlassCard>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="მოსმენა"
          onPress={() => {
            Sound.play('correct');
            Haptics.success();
          }}
          style={styles.testButton}
        >
          <MaterialCommunityIcons
            name={sf('speaker.wave.2.fill')}
            size={16}
            color={soundOn || hapticsOn ? Colors.phosphor : Colors.textSecondary}
          />
          <Text style={[body(15, '700'), { color: soundOn || hapticsOn ? Colors.phosphor : Colors.textSecondary }]}>
            მოსმენა
          </Text>
        </Pressable>

        <Text style={[caption(12), { color: Colors.textSecondary, opacity: 0.8, textAlign: 'center', paddingHorizontal: 12 }]}>
          აპს ახსოვს, რომელი სიტყვები და კითხვები უკვე ითამაშეთ, და გამეორებამდე მთელ კატეგორიას გადის.
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={didReset}
          onPress={askReset}
          style={styles.resetButton}
        >
          <MaterialCommunityIcons
            name={sf(didReset ? 'checkmark' : 'arrow.clockwise')}
            size={16}
            color={didReset ? Colors.phosphor : Colors.textSecondary}
          />
          <Text style={[body(14, '700'), { color: didReset ? Colors.phosphor : Colors.textSecondary }]}>
            {didReset ? 'მეხსიერება განულდა' : 'კონტენტის მეხსიერების განულება'}
          </Text>
        </Pressable>

        <View style={{ flex: 1 }} />

        <View style={{ paddingBottom: insets.bottom + Space.m }}>
          <PrimaryButton title="მზადაა" tint={Colors.phosphor} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        </View>
      </View>
    </View>
  );
}

function ToggleRow({
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
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[body(16, '700'), { color: Colors.textPrimary }]}>{title}</Text>
        <Text style={[caption(12), { color: Colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.surfaceHigh, true: Colors.phosphor }}
        thumbColor={Colors.textPrimary}
        accessibilityLabel={title}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { height: 1, backgroundColor: Colors.stroke },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: Radius.default,
    backgroundColor: Colors.surface,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.default,
    backgroundColor: Colors.surface,
  },
});
