import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, body, caption } from '../../theme/theme';
import { icon as sf } from '../../theme/icons';
import { ScreenHeader } from '../../ui/Cards';
import { Pressable } from '../../ui/Pressable';
import { Layout } from '../../ui/layout';
import { Haptics } from '../../core/haptics';
import type { GameFlowProps } from '../registry';
import { HerdFlow } from '../herd/Flow';
import { StandardsFlow } from '../standards/Flow';
import { TenButFlow } from '../tenbut/Flow';

/**
 * „რას იტყვიან?“ (Read the Room) — სამი რეჟიმის შესასვლელი.
 *
 * პორტი: `Splash/Games/TableRead/TableReadFlowView.swift`.
 *
 * კლასიკური Herd Mentality და ორი განსხვავებული პროგნოზის რეჟიმი.
 */

type Mode = 'majority' | 'line' | 'person';

interface ModeInfo {
  id: Mode;
  title: string;
  tagline: string;
  skill: string;
  icon: string;
  accent: string;
  minutes: number;
}

const MODES: ModeInfo[] = [
  {
    id: 'majority',
    title: 'Herd Mentality',
    tagline: 'ფარული პასუხები, უმრავლესობა და ვარდისფერი ძროხა.',
    skill: 'უმრავლესობა',
    icon: 'person.3.fill',
    accent: Colors.phosphor,
    minutes: 12,
  },
  {
    id: 'line',
    title: "Where's the Line?",
    tagline: 'ზრუნვაა თუ გადამეტება? ერთი კითხულობს მაგიდის გაყოფას.',
    skill: 'გაყოფა',
    icon: 'crown.fill',
    accent: Colors.neonCyan,
    minutes: 15,
  },
  {
    id: 'person',
    title: 'Rate Them',
    tagline: 'ერთი ჩვევა — გამოიცანი, რა ქულას დაწერს სამიზნე.',
    skill: 'ერთი ადამიანი',
    icon: 'target',
    accent: Colors.neonMagenta,
    minutes: 15,
  },
];

export function TableReadFlow({ roster, onExit }: GameFlowProps) {
  const [mode, setMode] = useState<Mode | null>(null);

  // რეჟიმიდან გამოსვლა ამ ეკრანზე აბრუნებს, არა თამაშიდან.
  const back = () => setMode(null);

  if (mode === 'majority') return <HerdFlow roster={roster} onExit={back} />;
  if (mode === 'line') return <StandardsFlow roster={roster} onExit={back} />;
  if (mode === 'person') return <TenButFlow roster={roster} onExit={back} />;

  return (
    <View style={{ flex: 1 }}>
      <View style={Layout.header}>
        <ScreenHeader title="Read the Room" subtitle="სამი რეჟიმი, ერთი უნარი" onBack={onExit} />
      </View>

      <ScrollView contentContainerStyle={[Layout.scroll, { gap: 12 }]}>
        <Text style={[body(14, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 12 }]}>
          აირჩიე რეჟიმი: დაწერე საერთო პასუხი, იწინასწარმეტყველე მაგიდის გაყოფა ან გამოიცანი ერთი ადამიანის შეფასება.
        </Text>

        {MODES.map((option) => (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityLabel={`${option.title}. ${option.tagline}`}
            accessibilityHint={`დაახლოებით ${option.minutes} წუთი`}
            onPress={() => {
              Haptics.medium();
              setMode(option.id);
            }}
            style={[styles.card, { borderColor: option.accent + '38' }]}
          >
            <View style={[styles.iconBox, { backgroundColor: option.accent + '1F' }]}>
              <MaterialCommunityIcons name={sf(option.icon)} size={23} color={option.accent} />
            </View>

            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[body(18, '900'), { color: Colors.textPrimary }]} numberOfLines={2} adjustsFontSizeToFit>
                {option.title}
              </Text>
              <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>{option.tagline}</Text>
              <View style={{ flexDirection: 'row', gap: 6, paddingTop: 2 }}>
                <Chip text={option.skill} tint={option.accent} />
                <Chip text={`~${option.minutes} წთ`} tint={Colors.textSecondary} />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function Chip({ text, tint }: { text: string; tint: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: tint + '1F' }]}>
      <Text style={[caption(11), { color: tint }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: Radius.default,
    backgroundColor: Colors.surface,
    borderWidth: 1,
  },
  iconBox: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
});
