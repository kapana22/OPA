import { PlayerCharacter } from '../../ui/PlayerCharacter';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, body, display, title as titleFont } from '../../theme/theme';
import { CategoryChip, GameExitButton, GlassCard, RankRow, ScreenHeader, CategoryChecklist , RulesSheet } from '../../ui/Cards';
import { textEntries } from '../categoryEntries';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Layout } from '../../ui/layout';
import { Confetti } from '../../ui/Confetti';
import { FitText } from '../../ui/FitText';
import { useKeepScreenAwake } from '../../core/orientationLock';
import { LaughBank } from '../../content/banks';
import { TurnRotation } from '../../core/turnRotation';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { GameFlowProps } from '../registry';
import { NoLaughEngine } from './engine';
import { game as findGame } from '../catalog';

/**
 * „არ გაიცინო“ — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/NoLaugh/*.swift` (5 ხედი).
 * ტელეფონი **ჯგუფს** რჩება, არა გაუძლებელს — ეკრანზე დავალებაა.
 */

const TIME_OPTIONS = [30, 45, 60];

export function NoLaughFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new NoLaughEngine([...roster.players]));
  useObservable(engine);

  // ეკრანიდან გასვლისას ტაიმერი ფონში არ უნდა დარჩეს.
  useEffect(() => () => engine.stop(), [engine]);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'announce':
      return <Announce engine={engine} onExit={onExit} />;
    case 'round':
      return <Round engine={engine} onExit={onExit} />;
    case 'result':
      return <Result engine={engine} onExit={onExit} />;
    case 'summary':
      return <Summary engine={engine} roster={roster} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: NoLaughEngine; onClose: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const gameData = findGame('nolaugh');
  return (
    <View style={{ flex: 1 }}>
      <RulesSheet visible={showRules} title="არ გაიცინო" accent={Colors.phosphor} steps={gameData?.howTo ?? []} onClose={() => setShowRules(false)} />

      <View style={Layout.header}>
        <ScreenHeader title="Don't Laugh"  onBack={onClose}  onInfo={() => setShowRules(true)} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>რამდენ ხანს უნდა გაუძლოს</Text>
            <View style={Layout.segmentRow}>
              {TIME_OPTIONS.map((value) => (
                <CategoryChip
                  compact
                  key={value}
                  label={`${value} წამი`}
                  selected={engine.settings.seconds === value}
                  onPress={() => engine.setSeconds(value)}
                />
              ))}
            </View>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>რაუნდები</Text>
            <View style={Layout.segmentRow}>
              {TurnRotation.lapOptions.map((laps) => (
                <CategoryChip
                  compact
                  key={laps}
                  label={TurnRotation.label(laps)}
                  selected={engine.settings.laps === laps}
                  onPress={() => engine.setLaps(laps)}
                />
              ))}
            </View>
            <Text style={[body(12, '500'), { color: Colors.textSecondary }]}>
              სულ {engine.totalRounds} რაუნდი.
            </Text>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორიები</Text>
            <CategoryChecklist
              build={() => textEntries(LaughBank, 'laugh', 'ყველა')}
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

// ── ვინ უძლებს

function Announce({ engine, onExit }: { engine: NoLaughEngine; onExit: () => void }) {
  // „შემდეგი რაუნდი“ იმავე ადგილასაა — ორმაგი შეხება რაუნდს ნაადრევად არ უნდა იწყებდეს.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 1000);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={{ flex: 1, gap: 18 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>
          რაუნდი {engine.round} / {engine.totalRounds}
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      <PlayerCharacter player={engine.holder} />
      <View style={{ gap: 6, paddingHorizontal: 24 }}>
        <FitText style={[titleFont(28), Layout.centered, { color: Colors.textPrimary }]} maxLines={1}>
          {engine.holder?.name ?? '—'}
        </FitText>
        <Text style={[body(15, '500'), Layout.centered, { color: Colors.textSecondary }]}>
          ამ რაუნდში არ უნდა გაიცინოს
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary, opacity: 0.8, paddingHorizontal: 8 }]}>
          ტელეფონი ჯგუფს გადაეცი, არა მას.
        </Text>
        <PrimaryButton title="დაწყება" icon="play.fill" tint={Colors.phosphor} enabled={armed} onPress={() => engine.beginRound()} />
      </View>
    </View>
  );
}

// ── რაუნდი

function Round({ engine, onExit }: { engine: NoLaughEngine; onExit: () => void }) {
  useKeepScreenAwake();

  const total = Math.max(1, engine.settings.seconds);
  const fraction = engine.remaining / total;
  const hot = engine.remaining <= 10;

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>
          რაუნდი {engine.round} / {engine.totalRounds}
        </Text>
      </View>

      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={[body(12, '700'), { color: Colors.textSecondary }]}>არ უნდა გაიცინოს</Text>
        <FitText
          style={[titleFont(24), Layout.centered, { color: Colors.neonMagenta, paddingHorizontal: 24 }]}
          maxLines={1}
        >
          {engine.holder?.name ?? '—'}
        </FitText>
      </View>

      <View style={{ alignItems: 'center', gap: 8 }}>
        <Text style={[display(68), Layout.digits, { color: hot ? Colors.phosphor : Colors.textPrimary }]}>
          {engine.remaining}
        </Text>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${Math.max(2, fraction * 100)}%`, backgroundColor: hot ? Colors.phosphor : Colors.neonMagenta },
            ]}
          />
        </View>
      </View>

      <View style={Layout.content}>
        <GlassCard padding={24}>
          <View style={{ gap: 12, alignItems: 'center' }}>
            <FitText
              style={[titleFont(23), Layout.centered, { color: Colors.textPrimary }]}
              maxLines={6}
            >
              {engine.currentTask}
            </FitText>
          </View>
        </GlassCard>
      </View>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <GhostButton title="შემდეგი დავალება" icon="shuffle" onPress={() => engine.nextTask()} />
        <PrimaryButton title="გაიცინა!" icon="face.smiling" tint={Colors.phosphor} onPress={() => engine.markLaughed()} />
      </View>
    </View>
  );
}

// ── რაუნდის შედეგი

function Result({ engine, onExit }: { engine: NoLaughEngine; onExit: () => void }) {
  const survived = engine.verdict === 'survived';

  // Swift-ის `onAppear`: დრო რომ ამოიწურება, მაგიდამ უნდა იგრძნოს — ადრე ჩუმად გადადიოდა.
  useEffect(() => {
    if (survived) Haptics.success();
    else Haptics.warning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <Text style={[titleFont(34), Layout.centered, { color: survived ? Colors.phosphor : Colors.neonMagenta }]}>
        {survived ? 'გაუძლო' : 'გაიცინა'}
      </Text>

      <FitText
        style={[body(17, '600'), Layout.centered, { color: Colors.textPrimary, paddingHorizontal: 24 }]}
        maxLines={2}
      >
        {engine.holder?.name ?? '—'}
      </FitText>

      <Text style={[body(14, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        {survived ? 'ბოლომდე სერიოზული დარჩა — მას +2 ქულა.' : 'ჯგუფმა გატეხა — თითოეულ დანარჩენს +1 ქულა.'}
      </Text>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton
          title={engine.isLastRound ? 'შედეგები' : 'შემდეგი რაუნდი'}
          icon="chevron.right"
          tint={Colors.phosphor}
          onPress={() => engine.next()}
        />
      </View>
    </View>
  );
}

// ── შეჯამება

function Summary({
  engine,
  onExit,
}: {
  engine: NoLaughEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {

  useAwardOnce(() => {
    Sound.play('win');
    Haptics.win();
  });

  const champion = engine.champion;
  const champions = engine.champions;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, gap: 14 }}>
        <View style={{ flex: 1 }} />

        <FitText
          style={[titleFont(28), Layout.centered, { color: Colors.phosphor, paddingHorizontal: 24 }]}
          maxLines={2}
        >
          {champion ? champions.map((p) => p.name).join(', ') : 'ქულა ვერავინ აიღო'}
        </FitText>

        {champion ? (
          <Text style={[body(15, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
            ყველაზე მეტი ქულა — {engine.scoreFor(champion)}
          </Text>
        ) : null}


        <ScrollView contentContainerStyle={[Layout.content, { gap: 8 }]}>
          {engine.ranking.map((player) => (
            <RankRow
              key={player.id}
              rank={engine.rankOf(player)}
              name={player.name}
              score={engine.scoreFor(player)}
              highlight={champions.some((c) => c.id === player.id)}
            />
          ))}
        </ScrollView>

        <View style={Layout.footer}>
          <PrimaryButton
            title="თავიდან"
            icon="arrow.clockwise"
            tint={Colors.phosphor}
            onPress={() => {
              engine.restart();
            }}
          />
          <GhostButton title="დასრულება" icon="xmark" onPress={onExit} />
        </View>
      </View>
      {champion ? <Confetti /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceHigh,
    overflow: 'hidden',
    alignSelf: 'stretch',
    marginHorizontal: 40,
  },
  barFill: { height: 8, borderRadius: 4 },
});
