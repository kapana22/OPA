import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Colors, body, title as titleFont } from '../../theme/theme';
import { GameExitButton, GlassCard, ScreenHeader, CategoryChecklist , RulesSheet } from '../../ui/Cards';
import { textEntries } from '../categoryEntries';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Layout } from '../../ui/layout';
import { FitText } from '../../ui/FitText';
import { TenButBank } from '../../content/banks';
import { useObservable } from '../../core/observable';
import { game } from '../catalog';
import type { GameFlowProps } from '../registry';
import { TenButEngine } from './engine';

/**
 * „10-ია, მაგრამ...“ (Rate Them) — ბარათი და „შემდეგი“, მეტი არაფერი.
 */

export function TenButFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new TenButEngine([...roster.players]));
  useObservable(engine);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'card':
      return <Card engine={engine} onExit={onExit} />;
    case 'summary':
      return null;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: TenButEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const rules = game('tenbut')?.howTo ?? [];
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="Ten But" accent={Colors.neonCyan} steps={rules} onClose={() => setShowRules(false)} />

      <View style={Layout.header}>
        <ScreenHeader title="Rate Them"  onBack={onClose}  onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>


        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორიები</Text>
            <CategoryChecklist
              build={() => textEntries(TenButBank, 'tenbut', 'ყველა')}
              selectedIDs={engine.settings.categoryIDs}
              onChange={(ids) => engine.setCategories(ids)}
            />
          </View>
        </GlassCard>
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton title="დაწყება" icon="play.fill" tint={Colors.phosphor} onPress={() => engine.startGame()} />
      </View>
    </View>
  );
}

// ── ბარათი

function Card({ engine, onExit }: { engine: TenButEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, gap: 18 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <View style={{ flex: 1 }} />
      </View>

      <View style={{ flex: 1 }} />

      <FitText style={[body(17, '900'), Layout.centered, { color: Colors.phosphor, paddingHorizontal: 32 }]} maxLines={2}>
        {engine.target?.name ?? '—'}
      </FitText>

      <View style={{ paddingHorizontal: 20 }}>
        <GlassCard padding={24}>
          <View style={{ gap: 14, alignItems: 'center' }}>
            <Text style={[body(16, '700'), { color: Colors.phosphor }]}>10-ია, მაგრამ...</Text>
            <FitText style={[titleFont(28), Layout.centered, { color: Colors.textPrimary }]} maxLines={6}>
              {engine.currentFlaw}
            </FitText>
          </View>
        </GlassCard>
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton title="შემდეგი" icon="chevron.right" tint={Colors.phosphor} onPress={() => engine.next()} />
        <GhostButton title="დასრულება" icon="flag.checkered" onPress={onExit} />
      </View>
    </View>
  );
}
