import { PlayerCharacter } from '../../ui/PlayerCharacter';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, Space, body, caption, Elevation } from '../../theme/theme';
import { CategoryChip, GameExitButton, GlassCard, RulesSheet, ScreenHeader } from '../../ui/Cards';
import { game as findGame } from '../catalog';
import { PrimaryButton, CompactButton, GhostButton } from '../../ui/Buttons';
import { Layout } from '../../ui/layout';
import { FitText } from '../../ui/FitText';
import { dareKindLabel, heatName, heatNote, type TruthDareHeat } from '../../content/banks';
import { useObservable } from '../../core/observable';
import type { GameFlowProps } from '../registry';
import { DareCardEngine } from './engine';

/**
 * „გააკეთე ან...“ (Do or Pay) — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/DareCard/DareCardViews.swift`.
 * **არჩევანი არ არსებობს**: ბარათი კარნახობს — ან ასრულებ, ან იხდი.
 */

const HEATS: TruthDareHeat[] = ['family', 'party', 'spicy'];

export function DareCardFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new DareCardEngine([...roster.players]));
  useObservable(engine);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'card':
      return <Play key={`${engine.drawn}:${engine.currentCard.text}`} engine={engine} onExit={onExit} />;
    case 'summary':
      return null;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: DareCardEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const gameData = findGame('darecard');

  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="Do or Pay" accent={Colors.phosphor} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />
      <View style={Layout.header}>
        <ScreenHeader
          title="Do or Pay"

          onBack={onClose}
          onInfo={() => setShowRules(true)}
        />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>სიცხარე</Text>
            <View style={Layout.segmentRow}>
              {HEATS.map((heat) => (
                <CategoryChip
                  compact
                  key={heat}
                  label={heatName[heat]}
                  selected={engine.settings.heat === heat}
                  onPress={() => engine.setHeat(heat)}
                />
              ))}
            </View>
            <Text style={[caption(11), { color: Colors.textSecondary }]}>{heatNote[engine.settings.heat]}</Text>
          </View>
        </GlassCard>

      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton
          title="დაწყება"
          icon="play.fill"
          tint={Colors.phosphor}
          enabled={engine.canPlay}
          onPress={() => engine.startGame()}
        />
      </View>
    </View>
  );
}

// ── ბარათი

function Play({ engine, onExit }: { engine: DareCardEngine; onExit: () => void }) {
  const card = engine.currentCard;
  const holder = engine.holder?.name ?? '—';

  const subject =
    card.kind === 'group'
      ? `${holder} კითხულობს`
      : card.kind === 'duel'
        ? `${holder} და ${engine.rival?.name ?? '—'}`
        : holder;

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, gap: Space.m }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <View style={{ flex: 1 }} />
        {engine.canSwap ? (
          <CompactButton title="სხვა ბარათი" onPress={() => engine.swapCard()} />
        ) : null}
      </View>

      <View style={{ flex: 1 }} />

      <PlayerCharacter player={engine.holder} compact />
      <View style={{ paddingHorizontal: 20 }}>
        <View style={[styles.cardFace, Elevation.card]}>
          <View style={styles.kindBadge}>
            <Text style={[body(12, '600'), { color: Colors.textSecondary }]}>{dareKindLabel[card.kind]}</Text>
          </View>

          <FitText
            style={[body(20, '700'), Layout.centered, { color: Colors.phosphor, paddingHorizontal: 20 }]}
            maxLines={2}
          >
            {subject}
          </FitText>

          <FitText
            style={[body(22, '700'), Layout.centered, { color: Colors.textPrimary, paddingHorizontal: 20 }]}
            maxLines={12}
          >
            {card.text}
          </FitText>

        </View>
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton
          title="შემდეგი"
          icon="chevron.right"
          tint={Colors.phosphor}
          onPress={() => engine.next()}
        />

        {engine.isEndless ? (
          <GhostButton title="დასრულება" onPress={onExit} />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardFace: {
    alignItems: 'center',
    gap: 18,
    paddingVertical: 22,
    borderRadius: 22,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.stroke,
  },
  kindBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.surface,
  },
});
