import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Colors, Radius, Space, body, caption, display, title as titleFont } from '../../theme/theme';
import { CategoryChip, GameExitButton, GlassCard, GlyphIcon, ScreenHeader } from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Confetti } from '../../ui/Confetti';
import { SpectrumBar, BandLegend } from './SpectrumBar';
import { SpectrumBank } from '../../content/banks';
import { TurnRotation } from '../../core/turnRotation';
import { Haptics } from '../../core/haptics';
import { Sound } from '../../core/sound';
import { useObservable } from '../../core/observable';
import type { GameFlowProps } from '../registry';
import { WavelengthEngine } from './engine';

/**
 * „ერთ ტალღაზე“ — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/Wavelength/*.swift` (6 ხედი).
 * **კოოპერაციულია** — ქულა მაგიდისაა, ტაბლოზე ყველას თანაბრად ერგება.
 */

export function WavelengthFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new WavelengthEngine([...roster.players]));
  useObservable(engine);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'clue':
      return <Clue engine={engine} onExit={onExit} />;
    case 'guess':
      return <Guess engine={engine} onExit={onExit} />;
    case 'result':
      return <Result engine={engine} onExit={onExit} />;
    case 'summary':
      return <Summary engine={engine} roster={roster} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: WavelengthEngine; onClose: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <ScreenHeader title="ერთ ტალღაზე" subtitle={`${engine.players.length} მოთამაშე`} onBack={onClose} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <GlassCard>
          <View style={{ gap: 10 }}>
            <Step n="1" text="შკალაზე დამალულ სამიზნეს მხოლოდ ერთი მოთამაშე ხედავს." />
            <Step n="2" text="ის ხმამაღლა ამბობს ერთ სიტყვას, რომელიც ზუსტად იმ ადგილს შეესაბამება." />
            <Step n="3" text="დანარჩენები კამათობენ და ნიშნულს ერთად აყენებენ." />
            <Step n="4" text="ქულას მიმანიშნებელი იღებს: რაც უფრო ახლოს მოხვდით, მით მეტი." />
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
              {SpectrumBank.categories.map((cat) => (
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

        <GlassCard>
          <View style={{ gap: 10 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>ქულის ზოლები</Text>
            <BandLegend />
            <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>
              რაც უფრო ახლოს დგება ჯგუფის ნიშნული სამიზნესთან, მით მეტ ქულას იღებს მიმანიშნებელი.
            </Text>
          </View>
        </GlassCard>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="დაწყება" icon="play.fill" tint={Colors.phosphor} onPress={() => engine.startGame()} />
      </View>
    </View>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View style={styles.stepBadge}>
        <Text style={[body(12, '900'), { color: Colors.ink }]}>{n}</Text>
      </View>
      <Text style={[body(14, '500'), { color: Colors.textSecondary, flex: 1 }]}>{text}</Text>
    </View>
  );
}

// ── მინიშნება (სამიზნე მხოლოდ დაჭერისას ჩანს)

function Clue({ engine, onExit }: { engine: WavelengthEngine; onExit: () => void }) {
  const [isHolding, setHolding] = useState(false);

  return (
    <View style={{ flex: 1, gap: 18 }}>
      <View style={styles.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(14, '700'), styles.digits, { color: Colors.textSecondary }]}>
          რაუნდი {engine.round} / {engine.totalRounds}
        </Text>
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="სხვა შკალა"
          onPress={() => {
            Haptics.tap();
            engine.skipSpectrum();
          }}
          style={styles.pill}
        >
          <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>სხვა შკალა</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center', gap: 4, paddingHorizontal: 24 }}>
        <Text style={[body(14, '500'), { color: Colors.textSecondary }]}>გადაეცი ტელეფონი</Text>
        <Text style={[titleFont(32), styles.centered, { color: Colors.textPrimary }]} adjustsFontSizeToFit numberOfLines={2}>
          {engine.clueGiver?.name ?? '—'}
        </Text>
        <Text style={[caption(12), { color: Colors.textSecondary }]}>დანარჩენებმა ეკრანს არ უნდა შეხედონ</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isHolding ? 'სამიზნე ჩანს' : 'დააჭირე და გეჭიროს — სამიზნის სანახავად'}
        onPressIn={() => {
          setHolding(true);
          Haptics.reveal();
          Sound.play('reveal');
        }}
        onPressOut={() => {
          setHolding(false);
          Haptics.tap();
        }}
        style={[
          styles.holdCard,
          {
            backgroundColor: isHolding ? Colors.neonCyan + '24' : Colors.surface,
            borderColor: isHolding ? Colors.neonCyan : Colors.stroke,
            borderWidth: isHolding ? 2 : 1,
          },
        ]}
      >
        {isHolding ? (
          <View style={{ gap: 16, alignSelf: 'stretch', paddingHorizontal: 20 }}>
            <SpectrumBar spectrum={engine.spectrum} target={engine.target} showBands />
            <BandLegend />
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 10 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>დააჭირე და გეჭიროს</Text>
            <Text style={[body(13, '500'), { color: Colors.textSecondary }]}>ხელს აიღებ — სამიზნე გაქრება</Text>
          </View>
        )}
      </Pressable>

      <Text style={[body(14, '500'), styles.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        მოიფიქრე ერთი სიტყვა ან მოკლე ფრაზა, რომელიც ზუსტად სამიზნეზე ჯდება, და ხმამაღლა თქვი.
      </Text>

      <View style={{ flex: 1 }} />

      <View style={styles.footer}>
        <PrimaryButton
          title="ვთქვი — გადაეცი"
          icon="checkmark"
          tint={Colors.phosphor}
          enabled={!isHolding}
          onPress={() => engine.beginGuess()}
        />
      </View>
    </View>
  );
}

// ── ჯგუფის ნიშნული

function Guess({ engine, onExit }: { engine: WavelengthEngine; onExit: () => void }) {
  return (
    <View style={{ flex: 1, gap: 18 }}>
      <View style={styles.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(14, '700'), styles.digits, { color: Colors.textSecondary }]}>
          რაუნდი {engine.round} / {engine.totalRounds}
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={[body(13, '700'), { color: Colors.textSecondary }]} numberOfLines={1}>
          მიმანიშნებელი: {engine.clueGiver?.name ?? '—'}
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text style={[display(58), styles.digits, { color: Colors.phosphor }]}>{engine.mark(engine.guess)}</Text>
        <Text style={[caption(12), { color: Colors.textSecondary }]}>ნიშნული</Text>
      </View>

      <View style={{ paddingHorizontal: 24 }}>
        <GlassCard padding={22}>
          <View style={{ gap: 18 }}>
            <SpectrumBar spectrum={engine.spectrum} guess={engine.guess} />
            <Slider
              value={engine.guess}
              minimumValue={0}
              maximumValue={1}
              onValueChange={(v) => engine.setGuess(v)}
              onSlidingComplete={() => Haptics.medium()}
              minimumTrackTintColor={Colors.phosphor}
              maximumTrackTintColor={Colors.surfaceHigh}
              thumbTintColor={Colors.phosphor}
            />
          </View>
        </GlassCard>
      </View>

      <Text style={[body(14, '500'), styles.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        ერთად გადაწყვიტეთ, სად დგას სამიზნე — ქულა საერთოა, ამიტომ ერთმანეთს არ უშლით.
      </Text>

      <View style={{ flex: 1 }} />

      <View style={styles.footer}>
        <PrimaryButton title="დაფიქსირება" icon="target" tint={Colors.phosphor} onPress={() => engine.lockGuess()} />
      </View>
    </View>
  );
}

// ── რაუნდის შედეგი

function Result({ engine, onExit }: { engine: WavelengthEngine; onExit: () => void }) {
  const points = engine.lastPoints;

  useEffect(() => {
    if (points >= 3) Haptics.success();
    else if (points === 0) Haptics.warning();
    else Haptics.medium();
  }, [points]);

  const color =
    points === 4 ? Colors.phosphor : points === 3 ? Colors.neonCyan : points > 0 ? Colors.phosphor : Colors.neonMagenta;
  const glyph =
    points === 4 ? 'target' : points === 3 ? 'hands.clap.fill' : points === 2 ? 'crown.fill' : points === 1 ? 'face.dashed.fill' : 'wind';

  return (
    <View style={{ flex: 1, gap: Space.m }}>
      <View style={styles.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center' }}>
        <GlyphIcon name={glyph} size={32} tint={color} />
      </View>

      <Text style={[titleFont(32), styles.centered, styles.digits, { color }]}>
        {points > 0 ? `+${points} ქულა` : 'ვერ მოხვდით'}
      </Text>

      <View style={{ alignItems: 'center', gap: 3, paddingHorizontal: 24 }}>
        <Text style={[body(17, '700'), styles.centered, { color: Colors.textPrimary }]} numberOfLines={2}>
          მიმანიშნებელი — {engine.clueGiver?.name ?? '—'}
        </Text>
        <Text style={[body(13, '600'), styles.digits, { color: Colors.neonCyan }]}>
          მაგიდის ანგარიში — {engine.tableScore} / მიზანი {engine.goal}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 24 }}>
        <GlassCard padding={22}>
          <View style={{ gap: 16 }}>
            <SpectrumBar spectrum={engine.spectrum} target={engine.target} guess={engine.guess} showBands />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <MarkChip label="სამიზნე" value={engine.mark(engine.target)} color={Colors.textPrimary} />
              <MarkChip label="ჯგუფი" value={engine.mark(engine.guess)} color={Colors.phosphor} />
            </View>
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

function MarkChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.markChip}>
      <Text style={[caption(11), { color: Colors.textSecondary }]}>{label}</Text>
      <Text style={[titleFont(20), styles.digits, { color }]}>{value}</Text>
    </View>
  );
}

// ── შეჯამება

function Summary({
  engine,
  roster,
  onExit,
}: {
  engine: WavelengthEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {
  const [applied, setApplied] = useState(false);
  const passed = engine.verdict !== 'missed';

  useEffect(() => {
    if (applied) return;
    setApplied(true);
    Sound.play('win');
    Haptics.win();
    // კოოპერაციულია — ყველას თანაბრად, პოდიუმის გარეშე.
    const reward = engine.rosterReward;
    for (const player of engine.players) roster.addScore(reward, player.id);
  }, [applied, engine, roster]);

  const headline =
    engine.verdict === 'brilliant' ? 'ერთ ტალღაზე ხართ' : engine.verdict === 'passed' ? 'მიზანი აღებულია' : 'ამჯერად ვერ მიაღწიეთ';

  const best = engine.bestClueGivers;
  const bestLine =
    best.length > 0 && engine.clueScore(best[0]) > 0
      ? `საუკეთესო მინიშნება — ${best.map((p) => p.name).join(', ')} (${engine.clueScore(best[0])} ქულა)`
      : null;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, gap: 14 }}>
        <View style={{ flex: 1 }} />

        <View style={{ alignItems: 'center' }}>
          <GlyphIcon
            name={passed ? 'trophy.fill' : 'arrow.triangle.2.circlepath'}
            size={31}
            tint={passed ? Colors.phosphor : Colors.textSecondary}
          />
        </View>

        <Text
          style={[titleFont(28), styles.centered, { color: passed ? Colors.neonCyan : Colors.textSecondary, paddingHorizontal: 24 }]}
          adjustsFontSizeToFit
          numberOfLines={2}
        >
          {headline}
        </Text>

        <View style={{ alignItems: 'center', gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={[display(64), styles.digits, { color: passed ? Colors.neonCyan : Colors.textPrimary }]}>
              {engine.tableScore}
            </Text>
            <Text style={[titleFont(22), styles.digits, { color: Colors.textSecondary }]}>/ {engine.maxScore}</Text>
          </View>
          <Text style={[body(13, '600'), styles.digits, { color: Colors.textSecondary }]}>
            მიზანი იყო {engine.goal}
          </Text>
        </View>

        {bestLine ? (
          <Text style={[body(14, '600'), styles.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
            {bestLine}
          </Text>
        ) : null}

        <Text
          style={[body(12, '500'), styles.centered, { color: Colors.textSecondary, opacity: 0.7, paddingHorizontal: 28 }]}
        >
          კოოპერაციული თამაშია — ტაბლოზე ყველას თანაბრად +{engine.rosterReward} ერიცხება
        </Text>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
          {engine.ranking.map((player) => (
            <View key={player.id} style={styles.row}>
              <Text style={[body(16, '600'), { color: Colors.textPrimary, flex: 1 }]} numberOfLines={1}>
                {player.name}
              </Text>
              <Text style={[titleFont(20), styles.digits, { color: Colors.textSecondary }]}>
                {engine.clueScore(player)}
              </Text>
            </View>
          ))}
        </ScrollView>

        <Text style={[caption(11), styles.centered, { color: Colors.textSecondary, opacity: 0.7 }]}>
          რიცხვი მიმანიშნებლის გვერდით — რამდენი მოუტანა მაგიდას
        </Text>

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

      {passed ? <Confetti /> : null}
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
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neonCyan,
  },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: Colors.surface },
  holdCard: {
    marginHorizontal: 24,
    minHeight: 190,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  markChip: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 10,
    borderRadius: Radius.small,
    backgroundColor: Colors.surfaceHigh,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Space.m,
    paddingVertical: 13,
    borderRadius: Radius.small,
    backgroundColor: Colors.surface,
  },
});
