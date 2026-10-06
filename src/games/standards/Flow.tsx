import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Colors, body, title as titleFont } from '../../theme/theme';
import { CategoryChecklist, GameExitButton, GlassCard, RulesSheet, ScreenHeader } from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Layout } from '../../ui/layout';
import { FitText } from '../../ui/FitText';
import { StandardsBank } from '../../content/banks';
import { useObservable } from '../../core/observable';
import { textEntries } from '../categoryEntries';
import { game } from '../catalog';
import type { GameFlowProps } from '../registry';
import { StandardsEngine } from './engine';

export function StandardsFlow({ onExit }: GameFlowProps) {
  const [engine] = useState(() => new StandardsEngine());
  const [showRules, setShowRules] = useState(false);
  useObservable(engine);

  if (engine.phase === 'setup') {
    return (
      <View style={{ flex: 1 }}>
        <RulesSheet visible={showRules} title="ნორმაა თუ არა?" accent={Colors.neonCyan}
          steps={game('standards')?.howTo ?? []} onClose={() => setShowRules(false)} />
        <View style={Layout.header}>
          <ScreenHeader title="The Line" onBack={onExit} onInfo={() => setShowRules(true)} />
        </View>
        <ScrollView contentContainerStyle={Layout.scroll}>
          <GlassCard>
            <View style={{ gap: 12 }}>
              <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორიები</Text>
              <CategoryChecklist build={() => textEntries(StandardsBank, 'standards', 'ყველა')}
                selectedIDs={engine.settings.categoryIDs} onChange={(ids) => engine.setCategories(ids)} />
            </View>
          </GlassCard>
        </ScrollView>
        <View style={Layout.footer}>
          <PrimaryButton title="დაწყება" icon="play.fill" tint={Colors.neonCyan} onPress={() => engine.startGame()} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={Layout.exitSlot}><GameExitButton onExit={onExit} /></View>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, gap: 24 }}>
        <Text style={[body(17, '700'), Layout.centered, { color: Colors.neonCyan }]}>ნორმაა თუ გადამეტებაა?</Text>
        <GlassCard padding={24}>
          <FitText accessibilityLiveRegion="polite" style={[titleFont(27), Layout.centered, { color: Colors.textPrimary }]} maxLines={8}>
            {engine.currentExpectation}
          </FitText>
        </GlassCard>
      </ScrollView>
      <View style={Layout.footer}>
        <PrimaryButton title="შემდეგი" icon="chevron.right" tint={Colors.neonCyan} onPress={() => engine.next()} />
        <GhostButton title="დასრულება" icon="flag.checkered" onPress={onExit} />
      </View>
    </View>
  );
}
