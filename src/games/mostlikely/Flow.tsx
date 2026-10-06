import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Colors, Space, body, title as titleFont } from '../../theme/theme';
import { GameExitButton, GlassCard, ScreenHeader, CategoryChecklist , RulesSheet } from '../../ui/Cards';
import { keyedEntries } from '../categoryEntries';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Layout } from '../../ui/layout';
import { FitText } from '../../ui/FitText';
import { PromptBank } from '../../content/banks';
import { useObservable } from '../../core/observable';
import type { GameFlowProps } from '../registry';
import { MostLikelyEngine } from './engine';
import { game as findGame } from '../catalog';

/**
 * „ვინ არის ყველაზე...“ — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/MostLikely/*.swift` (6 ხედი).
 * SwiftUI-ში ეს ექვსი ფაილი იყო; აქ ერთია — ეტაპები პატარაა და ერთად
 * კითხვადია, ძრავი კი ისედაც ცალკე დგას.
 */

export function MostLikelyFlow({ roster, onExit }: GameFlowProps) {
  const [instance] = useState(() => new MostLikelyEngine([...roster.players]));
  const engine = useObservable(instance);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'prompt':
      return <Prompt engine={engine} onExit={onExit} />;
    case 'summary':
      return null;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: MostLikelyEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const gameData = findGame('mostlikely');
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="Most Likely" accent={Colors.phosphor} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />

      <View style={Layout.header}>
        <ScreenHeader title="Most Likely"  onBack={onClose}  onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>
        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორიები</Text>
            <CategoryChecklist
              build={() => keyedEntries(PromptBank, 'prompt', (c) => c.prompts.map((p) => p.text), 'ყველა')}
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

// ── კითხვა

function Prompt({ engine, onExit }: { engine: MostLikelyEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, gap: Space.l }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <View style={{ flex: 1 }} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.content}>
        <GlassCard padding={28}>
          <FitText style={[titleFont(28), Layout.centered, { color: Colors.textPrimary }]} maxLines={6}>
            {engine.currentPrompt}
          </FitText>
        </GlassCard>
      </View>

      <Text style={[body(14, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        სამზე ერთად მიუთითეთ
      </Text>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton title="შემდეგი" icon="chevron.right" tint={Colors.phosphor} onPress={() => engine.next()} />
        <GhostButton title="დასრულება" icon="flag.checkered" onPress={onExit} />
      </View>
    </View>
  );
}
