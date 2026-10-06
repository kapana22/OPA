import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, body, title as titleFont } from '../../theme/theme';
import { GameExitButton, GlassCard, ScreenHeader, CategoryChecklist , RulesSheet } from '../../ui/Cards';
import { textEntries } from '../categoryEntries';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Layout } from '../../ui/layout';
import { FitText } from '../../ui/FitText';
import { NeverBank } from '../../content/banks';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import type { GameFlowProps } from '../registry';
import { NeverEngine } from './engine';
import { game as findGame } from '../catalog';
import { Icon } from '../../ui/Icon';

/**
 * „მე არასდროს...“ — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/Never/*.swift` (4 ხედი).
 */

/** დებულებები ამ სიტყვებით იწყება — ბარათზე ცალკე, ფოსფორის ფერად ჩანს. */
const LEAD = 'მე არასდროს';

export function NeverFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new NeverEngine([...roster.players]));
  useObservable(engine);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'round':
      return <Round engine={engine} onExit={onExit} />;
    case 'summary':
      return null;
  }
}

// ── პარამეტრები


function Setup({ engine, onClose }: { engine: NeverEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const gameData = findGame('never');
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="Never Have I Ever" accent={Colors.neonCyan} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />

      <View style={Layout.header}>
        <ScreenHeader title="Never Have I Ever"  onBack={onClose}  onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორიები</Text>
            <CategoryChecklist
              build={() => textEntries(NeverBank, 'never', 'ყველა')}
              selectedIDs={engine.settings.categoryIDs}
              onChange={(ids) => engine.setCategories(ids)}
            />
          </View>
        </GlassCard>
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton title="დაწყება" icon="play.fill" tint={Colors.neonCyan} onPress={() => engine.startGame()} />
      </View>
    </View>
  );
}

// ── რაუნდი

function Round({ engine, onExit }: { engine: NeverEngine; onExit: () => void }) {
  const text = engine.currentStatement;
  const tail = text.startsWith(LEAD) ? text.slice(LEAD.length).trim() : text;

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="სხვა დებულება"
          onPress={() => {
            Haptics.tap();
            engine.skipStatement();
          }}
          style={styles.pill}
        >
          <Icon name={'shuffle'} size={13} color={Colors.textSecondary} />
          <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>სხვა</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}>
        <GlassCard padding={24}>
          <View style={{ gap: 8, alignItems: 'center' }}>
            <Text style={[body(15, '700'), { color: Colors.phosphor }]}>{LEAD}</Text>
            <FitText
              style={[titleFont(tail.length > 70 ? 20 : 25), Layout.centered, { color: Colors.textPrimary }]}
              maxLines={6}
            >
              {tail}
            </FitText>
          </View>
        </GlassCard>

        <Text style={[body(14, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 12 }]}>
          თუ გაგიკეთებია, ერთი თითი მოკეცე.
        </Text>
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton
          title="შემდეგი"
          icon="chevron.right"
          tint={Colors.neonCyan}
          onPress={() => engine.next()}
        />
        <GhostButton title="დასრულება" icon="flag.checkered" onPress={onExit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.surface,
  },
});
