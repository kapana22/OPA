import { PlayerCharacter } from '../../ui/PlayerCharacter';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Colors, Space, body, title as titleFont } from '../../theme/theme';
import { CategoryChip, GameExitButton, GlassCard, ScreenHeader , RulesSheet } from '../../ui/Cards';
import { PrimaryButton, GhostButton, CompactButton } from '../../ui/Buttons';
import { BottleSpinner } from '../../ui/BottleSpinner';
import { Layout } from '../../ui/layout';
import { FitText } from '../../ui/FitText';
import { useKeepScreenAwake } from '../../core/orientationLock';
import { heatName, heatNote, type TruthDareHeat } from '../../content/banks';
import { useObservable } from '../../core/observable';
import type { GameFlowProps } from '../registry';
import { TruthDareEngine, TRUTHDARE_ORDERS, orderTitle } from './engine';
import { game as findGame } from '../catalog';

/**
 * „სიმართლე თუ მოქმედება“ — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/TruthDare/*.swift` (5 ხედი).
 * ქულები არ არის — ჯერი უბრალოდ წრეზე გადადის.
 */

const HEATS: TruthDareHeat[] = ['family', 'party', 'spicy'];

export function TruthDareFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new TruthDareEngine([...roster.players]));
  useObservable(engine);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'turn':
      return <Turn engine={engine} onExit={onExit} />;
    case 'task':
      return <Task engine={engine} onExit={onExit} />;
    case 'summary':
      return null;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: TruthDareEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const gameData = findGame('truthdare');
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="Truth or Dare" accent={Colors.neonCyan} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />

      <View style={Layout.header}>
        <ScreenHeader
          title="Truth or Dare"
          onBack={onClose}
         onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>დონე</Text>
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
            <Text style={[body(12, '500'), { color: Colors.textSecondary }]}>{heatNote[engine.settings.heat]}</Text>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>ვის ერგება ჯერი</Text>
            <View style={Layout.segmentRow}>
              {TRUTHDARE_ORDERS.map((order) => (
                <CategoryChip
                  compact
                  key={order}
                  label={orderTitle[order]}
                  selected={engine.settings.order === order}
                  onPress={() => engine.setOrder(order)}
                />
              ))}
            </View>
          </View>
        </GlassCard>

      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton title="დაწყება" enabled={engine.canPlay} onPress={() => engine.startGame()} />
      </View>
    </View>
  );
}

// ── ჯერი (ბოთლი ან პირდაპირ არჩევანი)

function Turn({ engine, onExit }: { engine: TruthDareEngine; onExit: () => void }) {
  // რომელ ჯერზე დატრიალდა ბოთლი — ახალ ჯერზე ისევ უნდა დატრიალდეს.
  const [bottleTurn, setBottleTurn] = useState<number | null>(null);
  const bottleDone = bottleTurn === engine.turn;
  const setBottleDone = (done: boolean) => setBottleTurn(done ? engine.turn : null);
  const needsBottle = engine.settings.order === 'bottle' && engine.players.length >= 2 && !bottleDone;

  const header = (
    <View style={Layout.topBar}>
      <GameExitButton onExit={onExit} />
      <View style={{ flex: 1 }} />
      <Text style={[body(13, '700'), { color: Colors.neonCyan }]}>{engine.heatName}</Text>
    </View>
  );

  if (needsBottle) {
    return (
      <View style={{ flex: 1, gap: 18 }}>
        {header}
        <View style={{ flex: 1 }} />
        <BottleSpinner
          key={engine.turn}
          players={engine.players}
          targetIndex={engine.currentIndex}
          onFinish={() => setBottleDone(true)}
        />
        <View style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, gap: 18 }}>
      {header}
      <View style={{ flex: 1 }} />

      {/* პორტრეტის ბარათი თვითონ ამბობს, ვისი ჯერია — ზემოთ ცალკე ხატულა ზედმეტი იყო. */}
      <PlayerCharacter player={engine.currentPlayer} compact />
      <View style={{ gap: 6, paddingHorizontal: 24 }}>
        <FitText style={[titleFont(28), Layout.centered, { color: Colors.textPrimary }]} maxLines={2}>
          {engine.currentPlayer?.name ?? '—'}
        </FitText>
      </View>

      <View style={{ flex: 1 }} />

      <View style={[Layout.footer, { gap: 12 }]}>
        <GhostButton
          title="სიმართლე"
          icon="bubble.left.and.bubble.right.fill"
          onPress={() => engine.pick('truth')}
        />
        <PrimaryButton
          title="მოქმედება"
          icon="figure.run"
          tint={Colors.phosphor}
          onPress={() => engine.pick('dare')}
        />
      </View>
    </View>
  );
}

// ── დავალება

function Task({ engine, onExit }: { engine: TruthDareEngine; onExit: () => void }) {
  useKeepScreenAwake();
  const isTruth = engine.choice === 'truth';
  const tint = isTruth ? Colors.neonCyan : Colors.phosphor;

  return (
    <View style={{ flex: 1, gap: Space.m }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <View style={{ flex: 1 }} />
        <Text style={[body(14, '700'), { color: tint }]} numberOfLines={1}>
          {engine.currentPlayer?.name ?? '—'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={[Layout.content, { flexGrow: 1, justifyContent: 'center', gap: 16, paddingVertical: 16 }]}>
      <Text style={[body(14, '700'), Layout.centered, { color: tint }]}>{isTruth ? 'სიმართლე' : 'მოქმედება'}</Text>

        <GlassCard padding={22}>
          <FitText
            style={[body(22, '700'), Layout.centered, { color: Colors.textPrimary }]}
            maxLines={10}
          >
            {engine.currentText}
          </FitText>
        </GlassCard>
      {engine.penalty !== null ? (
          <GlassCard padding={20}>
            <View style={{ gap: 8, alignItems: 'center' }}>
              <Text style={[body(14, '700'), { color: Colors.warmCream }]}>ჯარიმა</Text>
              <FitText style={[titleFont(20), Layout.centered, { color: Colors.textPrimary }]} maxLines={6}>
                {engine.penalty}
              </FitText>
            </View>
          </GlassCard>
      ) : null}

      </ScrollView>

      <View style={Layout.footer}>
        {engine.penalty === null ? <View style={{ flexDirection: 'row', gap: 10 }}>
          {engine.canSwap ? <View style={{ flex: 1 }}><CompactButton title="სხვა ბარათი" onPress={() => engine.swap()} /></View> : null}
          <View style={{ flex: 1 }}><CompactButton title="უარი" onPress={() => engine.refuse()} /></View>
        </View> : null}
        <PrimaryButton title="შემდეგი" icon="chevron.right" tint={tint} onPress={() => engine.next()} />
      </View>
    </View>
  );
}
