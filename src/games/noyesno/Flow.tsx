import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Colors, body, title as titleFont } from '../../theme/theme';
import { CategoryChip, GameExitButton, GlassCard, RankRow, RulesSheet, ScreenHeader } from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { PlayerCharacter } from '../../ui/PlayerCharacter';
import { Confetti } from '../../ui/Confetti';
import { Layout } from '../../ui/layout';
import { FitText } from '../../ui/FitText';
import { useKeepScreenAwake } from '../../core/orientationLock';
import { useAwardOnce } from '../../core/awardOnce';
import { useObservable } from '../../core/observable';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import { game } from '../catalog';
import type { GameFlowProps } from '../registry';
import { NoYesNoEngine } from './engine';

const TITLE = 'No Yes No';
/** შედეგის „შემდეგი“ და „მკითხველი მზადაა“ ერთ ადგილასაა — ორმაგი შეხება წამზომს ნაადრევად არ უნდა რთავდეს. */
const HANDOFF_LOCK_MS = 1000;
type ScreenProps = { engine: NoYesNoEngine; onExit: () => void };

export function NoYesNoFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new NoYesNoEngine(roster.players));
  useObservable(engine);
  useEffect(() => () => engine.abandon(), [engine]);
  if (engine.phase === 'summary') return <Summary engine={engine} roster={roster} onExit={onExit} />;
  if (engine.phase === 'playing') return <Play engine={engine} onExit={onExit} />;
  if (engine.phase === 'setup') return <Setup engine={engine} onExit={onExit} />;
  // `key` — შედეგიდან გადაცემაზე ეკრანი თავიდან იხატება და ღილაკის დაცვაც თავიდან იწყება.
  return <Turn key={engine.phase} engine={engine} onExit={onExit} />;
}

function Setup({ engine, onExit }: ScreenProps) {
  const [showRules, setShowRules] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title={TITLE} accent={Colors.neonCyan} steps={game('noyesno')?.howTo ?? []} onClose={() => setShowRules(false)} />
      <View style={Layout.header}>
        <ScreenHeader title={TITLE} subtitle="30 წამი" onBack={onExit} onInfo={() => setShowRules(true)} />
      </View>
      <ScrollView contentContainerStyle={Layout.scroll}>
        <GlassCard>
          <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>წრეები</Text>
          <View style={[Layout.segmentRow, { marginTop: 12 }]}>
            {[1, 2, 3].map(value => <CategoryChip compact key={value} label={String(value)} selected={engine.rounds === value} onPress={() => engine.setRounds(value)} />)}
          </View>
        </GlassCard>
      </ScrollView>
      <View style={Layout.footer}>
        <PrimaryButton title="დაწყება" icon="play.fill" tint={Colors.neonCyan} enabled={engine.players.length >= 2} onPress={() => engine.startGame()} />
      </View>
    </View>
  );
}

function Turn({ engine, onExit }: ScreenProps) {
  const result = engine.phase === 'result';
  const [armed, setArmed] = useState(result);
  useEffect(() => {
    if (result) return;
    const t = setTimeout(() => setArmed(true), HANDOFF_LOCK_MS);
    return () => clearTimeout(t);
  }, [result]);
  return (
    <View style={{ flex: 1 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(14, '700'), { color: Colors.textSecondary }]}>წრე {engine.round} / {engine.rounds}</Text>
      </View>
      <ScrollView contentContainerStyle={[Layout.scroll, { flexGrow: 1, justifyContent: 'center', gap: 20 }]}>
        <PlayerCharacter player={engine.currentPlayer} compact />
        <FitText style={[titleFont(30), Layout.centered, { color: Colors.textPrimary }]} maxLines={2}>{engine.currentPlayer?.name ?? ''}</FitText>
        {result ? (
          <>
            <Text style={[titleFont(26), Layout.centered, { color: Colors.neonCyan }]}>{engine.turnScore} ქულა</Text>
            <Text style={[body(16, '600'), Layout.centered, { color: Colors.textSecondary }]}>
              {engine.endReason === 'forbidden' ? 'აკრძალული სიტყვა წამოგცდა!' : 'დრო ამოიწურა!'}
            </Text>
          </>
        ) : (
          <>
            <Text style={[body(16, '600'), Layout.centered, { color: Colors.textSecondary }]}>შენ პასუხობ. არ თქვა „კი“ ან „არა“.</Text>
            <GlassCard>
              <Text style={[body(17, '700'), Layout.centered, { color: Colors.neonCyan }]}>კითხულობს: {engine.interviewer?.name}</Text>
              <Text style={[body(14, '500'), Layout.centered, { color: Colors.textSecondary, marginTop: 10 }]}>
                ტელეფონი მკითხველს მიეცით.
              </Text>
            </GlassCard>
          </>
        )}
      </ScrollView>
      <View style={Layout.footer}>
        <PrimaryButton title={result ? (engine.isLastTurn ? 'შედეგები' : 'შემდეგი მოთამაშე') : 'მკითხველი მზადაა'} tint={Colors.neonCyan} enabled={armed} onPress={() => result ? engine.next() : engine.beginTurn()} />
      </View>
    </View>
  );
}

function Play({ engine, onExit }: ScreenProps) {
  useKeepScreenAwake();
  const version = engine.questionVersion;
  return (
    <View style={{ flex: 1 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(18, '800'), Layout.digits, { color: engine.remaining <= 5 ? Colors.neonMagenta : Colors.textPrimary }]} accessibilityLabel={`დარჩა ${engine.remaining} წამი`}>
          {engine.remaining} წმ
        </Text>
        <Text style={[body(16, '700'), { color: Colors.neonCyan }]}>{engine.turnScore} ქულა</Text>
      </View>
      <ScrollView contentContainerStyle={[Layout.scroll, { flexGrow: 1, justifyContent: 'center', gap: 18 }]}>
        <Text style={[body(15, '600'), Layout.centered, { color: Colors.textSecondary }]}>პასუხობს: {engine.currentPlayer?.name}</Text>
        <Text style={[body(13, '500'), Layout.centered, { color: Colors.textSecondary }]}>კითხულობს: {engine.interviewer?.name}</Text>
        <Text style={[titleFont(24), Layout.centered, { color: Colors.neonMagenta }]}>„კი“ და „არა“ აკრძალულია</Text>
        <GlassCard>
          <FitText style={[titleFont(27), Layout.centered, { color: Colors.textPrimary }]} maxLines={8}>{engine.question}</FitText>
        </GlassCard>
        <Text style={[body(13, '500'), Layout.centered, { color: Colors.textSecondary }]}>შეაფასე მხოლოდ დასრულებული პასუხი.</Text>
      </ScrollView>
      <View style={Layout.footer}>
        <PrimaryButton title="ჩაითვალა +1" icon="checkmark" tint={Colors.neonCyan} onPress={() => { engine.answer(version); Haptics.tap(); }} />
        <PrimaryButton title="თქვა „კი“ ან „არა“" tint={Colors.neonMagenta} onPress={() => engine.forbidden(version)} />
        <GhostButton title="სხვა კითხვა" icon="arrow.right" onPress={() => engine.skip(version)} />
      </View>
    </View>
  );
}

function Summary({ engine, onExit }: ScreenProps & { roster: GameFlowProps['roster'] }) {
  useAwardOnce(() => {
    if (engine.winners.length) { Haptics.win(); Sound.play('win'); }
  });
  return (
    <View style={{ flex: 1 }}>
      <View style={Layout.header}>
        <Text style={[titleFont(29), Layout.centered, { color: Colors.textPrimary }]}>სიტყვების ოსტატი</Text>
      </View>
      <ScrollView contentContainerStyle={[Layout.scroll, { gap: 14 }]}>
        <Text style={[body(17, '700'), Layout.centered, { color: Colors.neonCyan }]}>
          {engine.winners.length ? engine.winners.map(p => p.name).join(', ') : 'ამჯერად ქულა ვერავინ აიღო'}
        </Text>
        {engine.ranking.map(player => <RankRow key={player.id} rank={engine.rankOf(player)} name={player.name} score={engine.totalFor(player)} highlight={engine.winners.some(p => p.id === player.id)} />)}
      </ScrollView>
      <View style={Layout.footer}>
        <PrimaryButton title="თავიდან" icon="arrow.clockwise" tint={Colors.neonCyan} onPress={() => engine.startGame()} />
        <GhostButton title="დასრულება" icon="xmark" onPress={onExit} />
      </View>
      {engine.winners.length ? <Confetti /> : null}
    </View>
  );
}
