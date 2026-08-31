import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Space, body, display, title as titleFont } from '../../theme/theme';
import { icon as sf } from '../../theme/icons';
import { CategoryChip, GameExitButton, GlassCard, GlyphIcon, RankRow, ScreenHeader } from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Confetti } from '../../ui/Confetti';
import { useKeepScreenAwake } from '../../core/orientationLock';
import { LaughBank } from '../../content/banks';
import { TurnRotation } from '../../core/turnRotation';
import { PodiumAward } from '../../core/podiumAward';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import { useObservable } from '../../core/observable';
import type { GameFlowProps } from '../registry';
import { NoLaughEngine } from './engine';

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
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <ScreenHeader title="არ გაიცინო" subtitle={`${engine.players.length} მოთამაშე`} onBack={onClose} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <GlassCard>
          <View style={{ gap: 8 }}>
            <Text style={[body(14, '600'), { color: Colors.textPrimary }]}>
              ერთი უნდა გაუძლოს, დანარჩენები კი აცინებენ.
            </Text>
            <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>
              ტელეფონი ჯგუფს რჩება, არა მას. ეკრანზე დავალებაა — შეასრულეთ ხმამაღლა და თვალწინ. ღიმილიც ითვლება.
            </Text>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>რამდენ ხანს უნდა გაუძლოს</Text>
            <View style={styles.chipRow}>
              {TIME_OPTIONS.map((value) => (
                <CategoryChip
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
            <View style={styles.chipRow}>
              {TurnRotation.lapOptions.map((laps) => (
                <CategoryChip
                  key={laps}
                  label={TurnRotation.label(laps)}
                  selected={engine.settings.laps === laps}
                  onPress={() => engine.setLaps(laps)}
                />
              ))}
            </View>
            <Text style={[body(12, '500'), { color: Colors.textSecondary }]}>
              სულ {engine.totalRounds} რაუნდი — ყველას ზუსტად თანაბრად ხვდება ჯერი.
            </Text>
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორია</Text>
            <View style={styles.chipRow}>
              <CategoryChip
                label="ყველა"
                selected={engine.settings.categoryID === null}
                onPress={() => engine.setCategory(null)}
              />
              {LaughBank.categories.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  label={`${cat.emoji} ${cat.name}`}
                  selected={engine.settings.categoryID === cat.id}
                  onPress={() => engine.setCategory(cat.id)}
                />
              ))}
            </View>
          </View>
        </GlassCard>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="დაწყება" icon="play.fill" tint={Colors.phosphor} onPress={() => engine.startGame()} />
      </View>
    </View>
  );
}

// ── ვინ უძლებს

function Announce({ engine, onExit }: { engine: NoLaughEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, gap: 18 }}>
      <View style={styles.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon name="face.dashed.fill" size={32} tint={Colors.phosphor} />
      </View>

      <Text style={[body(15, '500'), styles.centered, { color: Colors.textSecondary }]}>
        ამ რაუნდში არ უნდა გაიცინოს
      </Text>

      <Text
        style={[titleFont(36), styles.centered, { color: Colors.neonMagenta, paddingHorizontal: 24 }]}
        adjustsFontSizeToFit
        numberOfLines={2}
      >
        {engine.holder?.name ?? '—'}
      </Text>

      <View style={{ paddingHorizontal: 24 }}>
        <GlassCard>
          <View style={{ gap: 8 }}>
            <Tip icon="iphone.gen3" text="ტელეფონი ჯგუფს გადაეცი, არა მას." />
            <Tip icon="timer" text={`დანარჩენები ${engine.settings.seconds} წამის განმავლობაში აცინებენ.`} />
            <Tip icon="face.smiling" text="ღიმილიც ითვლება — კბილი არ უნდა გამოჩნდეს." />
          </View>
        </GlassCard>
      </View>

      <Text style={[body(13, '700'), styles.centered, styles.digits, { color: Colors.textSecondary }]}>
        რაუნდი {engine.round} / {engine.totalRounds}
      </Text>

      <View style={{ flex: 1 }} />

      <View style={styles.footer}>
        <PrimaryButton title="დაწყება" icon="play.fill" tint={Colors.phosphor} onPress={() => engine.beginRound()} />
      </View>
    </View>
  );
}

function Tip({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <MaterialCommunityIcons name={sf(icon)} size={16} color={Colors.textSecondary} />
      <Text style={[body(14, '500'), { color: Colors.textSecondary, flex: 1 }]}>{text}</Text>
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
      <View style={styles.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(14, '700'), styles.digits, { color: Colors.textSecondary }]}>
          რაუნდი {engine.round} / {engine.totalRounds}
        </Text>
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={engine.isPaused ? 'გაგრძელება' : 'პაუზა'}
          onPress={() => engine.togglePause()}
          style={styles.roundButton}
        >
          <MaterialCommunityIcons
            name={sf(engine.isPaused ? 'play.fill' : 'pause.fill')}
            size={14}
            color={Colors.textSecondary}
          />
        </Pressable>
      </View>

      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text style={[body(12, '700'), { color: Colors.textSecondary }]}>არ უნდა გაიცინოს</Text>
        <Text
          style={[titleFont(24), styles.centered, { color: Colors.neonMagenta, paddingHorizontal: 24 }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {engine.holder?.name ?? '—'}
        </Text>
      </View>

      <View style={{ alignItems: 'center', gap: 8 }}>
        <Text style={[display(68), styles.digits, { color: hot ? Colors.phosphor : Colors.textPrimary }]}>
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
        {engine.isPaused ? <Text style={[body(13, '700'), { color: Colors.phosphor }]}>პაუზა</Text> : null}
      </View>

      <View style={{ paddingHorizontal: 24 }}>
        <GlassCard padding={24}>
          <View style={{ gap: 12, alignItems: 'center' }}>
            <Text style={[body(12, '700'), styles.digits, { color: Colors.textSecondary }]}>
              დავალება #{engine.tasksThisRound}
            </Text>
            <Text
              style={[titleFont(23), styles.centered, { color: Colors.textPrimary }]}
              adjustsFontSizeToFit
              numberOfLines={5}
            >
              {engine.currentTask}
            </Text>
          </View>
        </GlassCard>
      </View>

      <View style={{ flex: 1 }} />

      <View style={[styles.footer, { gap: 10 }]}>
        <GhostButton title="შემდეგი დავალება" icon="shuffle" onPress={() => engine.nextTask()} />
        <PrimaryButton title="გაიცინა!" icon="face.smiling" tint={Colors.phosphor} onPress={() => engine.markLaughed()} />
      </View>
    </View>
  );
}

// ── რაუნდის შედეგი

function Result({ engine, onExit }: { engine: NoLaughEngine; onExit: () => void }) {
  const survived = engine.verdict === 'survived';

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={styles.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon
          name={survived ? 'face.dashed.fill' : 'face.smiling'}
          size={36}
          tint={survived ? Colors.phosphor : Colors.neonMagenta}
        />
      </View>

      <Text style={[titleFont(34), styles.centered, { color: survived ? Colors.phosphor : Colors.neonMagenta }]}>
        {survived ? 'გაუძლო' : 'გაიცინა'}
      </Text>

      <Text
        style={[body(17, '600'), styles.centered, { color: Colors.textPrimary, paddingHorizontal: 24 }]}
        numberOfLines={2}
        adjustsFontSizeToFit
      >
        {engine.holder?.name ?? '—'}
      </Text>

      <Text style={[body(14, '500'), styles.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        {survived ? 'ბოლომდე სერიოზული დარჩა — მას +2 ქულა.' : 'ჯგუფმა გატეხა — თითოეულ დანარჩენს +1 ქულა.'}
      </Text>

      <View style={{ paddingHorizontal: 24 }}>
        <GlassCard>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[body(13, '500'), { color: Colors.textSecondary, flex: 1 }]}>დავალება დაიხარჯა</Text>
            <Text style={[body(14, '900'), styles.digits, { color: Colors.textPrimary }]}>{engine.tasksThisRound}</Text>
          </View>
        </GlassCard>
      </View>

      <View style={{ flex: 1 }} />

      <View style={styles.footer}>
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
  roster,
  onExit,
}: {
  engine: NoLaughEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (applied) return;
    setApplied(true);
    Sound.play('win');
    Haptics.win();
    PodiumAward.apply(engine.results, roster);
  }, [applied, engine, roster]);

  const champion = engine.champion;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, gap: 14 }}>
        <View style={{ flex: 1 }} />

        <View style={{ alignItems: 'center' }}>
          <GlyphIcon name="trophy.fill" size={31} tint={Colors.phosphor} />
        </View>

        <Text style={[titleFont(28), styles.centered, { color: Colors.phosphor }]}>
          {champion ? champion.name : 'ქულა ვერავინ აიღო'}
        </Text>

        {champion ? (
          <Text style={[body(15, '600'), styles.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
            ყველაზე მეტი ქულა — {engine.scoreFor(champion)}
          </Text>
        ) : null}

        <Text style={[body(12, '500'), styles.centered, { color: Colors.textSecondary, opacity: 0.7 }]}>
          საერთო ტაბლოზე პირველ სამს +3 / +2 / +1 ერიცხება
        </Text>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
          {engine.ranking.map((player, rank) => (
            <RankRow
              key={player.id}
              rank={rank + 1}
              name={player.name}
              score={engine.scoreFor(player)}
              highlight={rank === 0}
            />
          ))}
        </ScrollView>

        <View style={[styles.footer, { gap: 10 }]}>
          <PrimaryButton
            title="თავიდან"
            icon="arrow.clockwise"
            tint={Colors.phosphor}
            onPress={() => {
              setApplied(false);
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
  scroll: { paddingHorizontal: 20, paddingTop: Space.m, paddingBottom: 24, gap: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { paddingHorizontal: 24, paddingBottom: Space.m },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingTop: Space.m },
  exitSlot: { position: 'absolute', top: 10, left: 20, zIndex: 10 },
  centered: { textAlign: 'center' },
  digits: { fontVariant: ['tabular-nums'] },
  roundButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
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
