import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Colors, Radius, Space, body, caption, display, title as titleFont } from '../../theme/theme';
import { icon as sf } from '../../theme/icons';
import { CategoryChip, GameExitButton, GlassCard, GlyphIcon, RankRow, ScreenHeader, ToggleRow } from '../../ui/Cards';
import { PrimaryButton, GhostButton } from '../../ui/Buttons';
import { Pressable } from '../../ui/Pressable';
import { Confetti } from '../../ui/Confetti';
import { Layout } from '../../ui/layout';
import { DilemmaBank } from '../../content/banks';
import { PodiumAward } from '../../core/podiumAward';
import { Haptics } from '../../core/haptics';
import { useObservable } from '../../core/observable';
import { useAwardOnce } from '../../core/awardOnce';
import type { GameFlowProps } from '../registry';
import { HerdEngine, type HerdSide } from './engine';

/**
 * „როგორც ყველა“ (Herd Mentality) — სრული ნაკადი.
 *
 * პორტი: `Splash/Games/Herd/*.swift` (6 ხედი).
 * ქულა უმრავლესობას ერგება — **გარდა შებრუნებული რაუნდებისა**, სადაც პირიქითაა.
 */

const ROUND_OPTIONS = [5, 8, 12];

/** პალიტრა — `HerdPalette` Swift-იდან. */
const Palette = {
  base: Colors.phosphor,
  twist: Colors.phosphor,
  sideA: Colors.neonCyan,
  sideB: Colors.neonMagenta,
  accent: (reversed: boolean) => (reversed ? Colors.phosphor : Colors.phosphor),
  color: (side: HerdSide) => (side === 'a' ? Colors.neonCyan : Colors.neonMagenta),
  letter: (side: HerdSide) => (side === 'a' ? 'ა' : 'ბ'),
};

export function HerdFlow({ roster, onExit }: GameFlowProps) {
  const [engine] = useState(() => new HerdEngine([...roster.players]));
  useObservable(engine);

  switch (engine.phase) {
    case 'setup':
      return <Setup engine={engine} onClose={onExit} />;
    case 'intro':
      return <Intro engine={engine} onExit={onExit} />;
    case 'voting':
      return <Vote engine={engine} onExit={onExit} />;
    case 'result':
      return <Result engine={engine} onExit={onExit} />;
    case 'summary':
      return <Summary engine={engine} roster={roster} onExit={onExit} />;
  }
}

// ── პარამეტრები

function Setup({ engine, onClose }: { engine: HerdEngine; onClose: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={Layout.header}>
        <ScreenHeader title="როგორც ყველა" subtitle={`${engine.players.length} მოთამაშე`} onBack={onClose} />
      </View>

      <ScrollView contentContainerStyle={Layout.scroll}>
        <GlassCard>
          <View style={{ gap: 10 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>როგორ ითვლება ქულა</Text>
            <Rule text="ეკრანზე ორი ვარიანტია — ფარულად ირჩევ ერთს." />
            <Rule text="ქულა იმას ერგება, ვინც უმრავლესობაში აღმოჩნდება." />
            <Rule text="ზოგი რაუნდი შებრუნებულია: მაშინ ქულას უმცირესობა იღებს." tint={Palette.twist} />
            <Rule text="თუ ხმები თანაბრად გაიყო, ქულას ვერავინ იღებს." />
          </View>
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>რაუნდები</Text>
            <View style={Layout.segmentRow}>
              {ROUND_OPTIONS.map((count) => (
                <CategoryChip
                  compact
                  key={count}
                  label={String(count)}
                  selected={engine.settings.rounds === count}
                  onPress={() => engine.setRounds(count)}
                />
              ))}
            </View>
          </View>
        </GlassCard>

        <GlassCard>
          <ToggleRow
            title="შებრუნებული რაუნდები"
            subtitle="პარტიაში რამდენიმე რაუნდში ქულას უმცირესობა იღებს — რომელში, წინასწარ არავინ იცის"
            value={engine.settings.twists}
            onChange={(v) => engine.setTwists(v)}
          />
        </GlassCard>

        <GlassCard>
          <View style={{ gap: 12 }}>
            <Text style={[body(17, '700'), { color: Colors.textPrimary }]}>კატეგორია</Text>
            <View style={Layout.chipRow}>
              <CategoryChip
                label="ყველა"
                selected={engine.settings.categoryID === null}
                onPress={() => engine.setCategory(null)}
              />
              {DilemmaBank.categories.map((cat) => (
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

      <View style={Layout.footer}>
        <PrimaryButton title="დაწყება" icon="play.fill" tint={Palette.base} onPress={() => engine.startGame()} />
      </View>
    </View>
  );
}

function Rule({ text, tint = Colors.textSecondary }: { text: string; tint?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <Text style={[body(14, '700'), { color: tint }]}>•</Text>
      <Text style={[body(14, '500'), { color: tint, flex: 1 }]}>{text}</Text>
    </View>
  );
}

// ── დილემის გაცნობა

function Intro({ engine, onExit }: { engine: HerdEngine; onExit: () => void }) {
  const reversed = engine.isReversed;
  const accent = Palette.accent(reversed);

  useEffect(() => {
    if (reversed) Haptics.warning();
  }, [reversed]);

  return (
    <View style={{ flex: 1, gap: 18 }}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>
          რაუნდი {engine.round} / {engine.settings.rounds}
        </Text>
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="სხვა დილემა"
          onPress={() => {
            Haptics.tap();
            engine.skipDilemma();
          }}
          style={styles.pill}
        >
          <MaterialCommunityIcons name={sf('shuffle')} size={13} color={Colors.textSecondary} />
          <Text style={[body(13, '700'), { color: Colors.textSecondary }]}>სხვა</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }} />

      {reversed ? (
        <View style={styles.twistBanner}>
          <Text style={[body(12, '900'), { color: Colors.ink }]}>შებრუნებული რაუნდი</Text>
        </View>
      ) : null}

      <Text
        style={[titleFont(27), Layout.centered, { color: Colors.textPrimary, paddingHorizontal: 28 }]}
        adjustsFontSizeToFit
        numberOfLines={4}
      >
        {engine.currentDilemma.question}
      </Text>

      <View style={[Layout.content, { flexDirection: 'row', gap: 12 }]}>
        <OptionCard side="a" text={engine.currentDilemma.a} />
        <OptionCard side="b" text={engine.currentDilemma.b} />
      </View>

      <Text style={[body(14, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        {reversed
          ? 'ამ რაუნდში წესი შებრუნებულია — ქულას უმცირესობა იღებს.'
          : 'ქულა იმას ერგება, ვინც უმრავლესობას დაემთხვევა — არა იმას, ვისაც მართლა ეს უყვარს.'}
      </Text>

      <View style={{ flex: 1 }} />

      <View style={Layout.footer}>
        <PrimaryButton
          title="კენჭისყრის დაწყება"
          icon="hand.point.up.left.fill"
          tint={accent}
          onPress={() => engine.beginVoting()}
        />
      </View>
    </View>
  );
}

function OptionCard({ side, text }: { side: HerdSide; text: string }) {
  const color = Palette.color(side);
  return (
    <View style={[styles.optionCard, { borderColor: color + '4D' }]}>
      <View style={[styles.letterBadge, { backgroundColor: color }]}>
        <Text style={[body(13, '900'), { color: Colors.ink }]}>{Palette.letter(side)}</Text>
      </View>
      <Text style={[body(15, '700'), Layout.centered, { color: Colors.textPrimary }]} numberOfLines={3} adjustsFontSizeToFit>
        {text}
      </Text>
    </View>
  );
}

// ── კენჭისყრა

function Vote({ engine, onExit }: { engine: HerdEngine; onExit: () => void }) {
  const reversed = engine.isReversed;
  const accent = Palette.accent(reversed);

  return (
    <View style={{ flex: 1, gap: Space.m }} key={engine.voterIndex}>
      <View style={Layout.topBar}>
        <GameExitButton onExit={onExit} />
        {reversed ? (
          <View style={styles.twistPill}>
            <Text style={[body(12, '900'), { color: Colors.ink }]}>შებრუნებული რაუნდი</Text>
          </View>
        ) : null}
        <View style={{ flex: 1 }} />
        <Text style={[body(14, '700'), Layout.digits, { color: Colors.textSecondary }]}>
          {engine.voterIndex + 1} / {engine.players.length}
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      <View style={{ alignItems: 'center', gap: 4, paddingHorizontal: 24 }}>
        <Text style={[body(14, '500'), { color: Colors.textSecondary }]}>გადაეცი ტელეფონი</Text>
        <Text style={[titleFont(32), Layout.centered, { color: accent }]} adjustsFontSizeToFit numberOfLines={2}>
          {engine.currentVoter?.name ?? '—'}
        </Text>
      </View>

      <Text style={[body(16, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        {engine.currentDilemma.question}
      </Text>

      <View style={[Layout.content, { gap: 12 }]}>
        <VoteButton side="a" text={engine.currentDilemma.a} onPress={() => engine.castVote('a')} />
        <VoteButton side="b" text={engine.currentDilemma.b} onPress={() => engine.castVote('b')} />
      </View>

      <Text style={[body(13, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
        {reversed
          ? 'შებრუნებულია: აირჩიე ის, რასაც უმცირესობა აირჩევს'
          : 'შენი გემოვნება არ ითვლება — აირჩიე ის, რასაც უმრავლესობა აირჩევს'}
      </Text>

      <View style={{ flex: 1 }} />
    </View>
  );
}

function VoteButton({ side, text, onPress }: { side: HerdSide; text: string; onPress: () => void }) {
  const color = Palette.color(side);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={text}
      onPress={() => {
        Haptics.medium();
        onPress();
      }}
      style={[styles.voteButton, { borderColor: color + '59' }]}
    >
      <View style={[styles.letterBadge, { backgroundColor: color }]}>
        <Text style={[body(13, '900'), { color: Colors.ink }]}>{Palette.letter(side)}</Text>
      </View>
      <Text style={[body(17, '700'), { color: Colors.textPrimary, flex: 1 }]}>{text}</Text>
    </Pressable>
  );
}

// ── რაუნდის შედეგი

function Result({ engine, onExit }: { engine: HerdEngine; onExit: () => void }) {
  useEffect(() => {
    if (engine.isTie) Haptics.warning();
    else Haptics.success();
  }, [engine.isTie]);

  const total = Math.max(1, engine.countA + engine.countB);
  const fractionA = engine.countA / total;
  const accent = Palette.accent(engine.isReversed);
  const shade = (side: HerdSide) => (engine.winningSide === null ? 0.85 : side === engine.winningSide ? 1 : 0.28);

  return (
    <View style={{ flex: 1, gap: 14 }}>
      <View style={Layout.exitSlot}>
        <GameExitButton onExit={onExit} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 14 }}>
        <Text style={[body(13, '700'), Layout.digits, { color: Colors.textSecondary }]}>
          რაუნდი {engine.round} / {engine.settings.rounds}
        </Text>
        {engine.isReversed ? (
          <View style={styles.twistPill}>
            <Text style={[body(12, '900'), { color: Colors.ink }]}>შებრუნებული</Text>
          </View>
        ) : null}
      </View>

      <Text style={[body(15, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 40 }]}>
        {engine.currentDilemma.question}
      </Text>

      {/* ორმხრივი ზოლი */}
      <View style={{ gap: 10, paddingHorizontal: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Text style={[display(46), Layout.digits, { color: Palette.sideA }]}>{engine.countA}</Text>
          <Text style={[titleFont(28), { color: Colors.textSecondary }]}>:</Text>
          <Text style={[display(46), Layout.digits, { color: Palette.sideB }]}>{engine.countB}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, height: 22 }}>
          <View
            style={{
              flex: Math.max(0.06, fractionA),
              borderRadius: 8,
              backgroundColor: Palette.sideA,
              opacity: shade('a'),
            }}
          />
          <View
            style={{
              flex: Math.max(0.06, 1 - fractionA),
              borderRadius: 8,
              backgroundColor: Palette.sideB,
              opacity: shade('b'),
            }}
          />
        </View>
      </View>

      {/* ვერდიქტი */}
      {engine.isTie ? (
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={[titleFont(26), { color: Colors.textPrimary }]}>ფრე</Text>
          <Text style={[body(13, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 34 }]}>
            მაგიდა ზუსტად შუაზე გაიყო — ქულა ვერავინ აიღო. სამაგიეროდ ორივე ბანაკი დარწმუნებულია, რომ მართალი ისაა.
          </Text>
        </View>
      ) : (
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={[titleFont(26), { color: accent }]}>
            {engine.isReversed ? 'ქულა უმცირესობას' : 'ქულა უმრავლესობას'}
          </Text>
          <Text style={[body(13, '500'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 34 }]}>
            {engine.roundWinners.length} მოთამაშემ აიღო ქულა
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Column engine={engine} side="a" text={engine.currentDilemma.a} />
          <Column engine={engine} side="b" text={engine.currentDilemma.b} />
        </View>
      </ScrollView>

      <View style={Layout.footer}>
        <PrimaryButton
          title={engine.round >= engine.settings.rounds ? 'შედეგები' : 'შემდეგი დილემა'}
          icon="chevron.right"
          tint={accent}
          onPress={() => engine.next()}
        />
      </View>
    </View>
  );
}

function Column({ engine, side, text }: { engine: HerdEngine; side: HerdSide; text: string }) {
  const color = Palette.color(side);
  const voters = engine.voters(side);
  const won = engine.winningSide === side;

  return (
    <View style={[styles.column, { borderColor: won ? color : Colors.stroke, borderWidth: won ? 2 : 1 }]}>
      <View style={[styles.letterBadge, { backgroundColor: color }]}>
        <Text style={[body(13, '900'), { color: Colors.ink }]}>{Palette.letter(side)}</Text>
      </View>
      <Text style={[body(14, '700'), Layout.centered, { color: Colors.textPrimary }]} numberOfLines={3}>
        {text}
      </Text>
      {voters.length === 0 ? (
        <Text style={[caption(11), { color: Colors.textSecondary, opacity: 0.7 }]}>არავინ</Text>
      ) : (
        voters.map((p) => (
          <Text key={p.id} style={[caption(11), Layout.centered, { color: Colors.textSecondary }]} numberOfLines={1}>
            {p.name}
          </Text>
        ))
      )}
    </View>
  );
}

// ── შეჯამება

function Summary({
  engine,
  roster,
  onExit,
}: {
  engine: HerdEngine;
  roster: GameFlowProps['roster'];
  onExit: () => void;
}) {

  useAwardOnce(() => {
    PodiumAward.apply(engine.results, roster);
    Haptics.win();
  });

  const top = engine.ranking[0];
  const champion = top && engine.totalFor(top) > 0 ? top : null;
  const odd = engine.oddOneOut;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, gap: 14 }}>
        <View style={{ flex: 1 }} />

        <View style={{ alignItems: 'center' }}>
          <GlyphIcon name="person.3.fill" size={31} tint={Palette.base} />
        </View>

        <Text style={[titleFont(28), Layout.centered, { color: Palette.base }]}>
          {champion ? 'მაგიდის სარკე' : 'ქულა ვერავინ აიღო'}
        </Text>

        {champion ? (
          <Text style={[body(15, '600'), Layout.centered, { color: Colors.textSecondary, paddingHorizontal: 32 }]}>
            {champion.name} — {engine.totalFor(champion)} ქულა
          </Text>
        ) : null}

        {odd.length > 0 ? (
          <Text style={[body(13, '600'), Layout.centered, { color: Colors.neonMagenta, paddingHorizontal: 32 }]}>
            შავი ცხვარი — {odd.map((p) => p.name).join(', ')} ({engine.oddCount(odd[0])})
          </Text>
        ) : null}

        <Text style={[body(12, '500'), Layout.centered, { color: Colors.textSecondary, opacity: 0.7 }]}>
          საერთო ტაბლოზე პირველ სამს +3 / +2 / +1 ერიცხება
        </Text>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
          {engine.ranking.map((player, rank) => (
            <RankRow key={player.id} rank={rank + 1} name={player.name} score={engine.totalFor(player)} highlight={rank === 0} />
          ))}
        </ScrollView>

        <View style={Layout.footer}>
          <PrimaryButton
            title="თავიდან"
            icon="arrow.clockwise"
            tint={Palette.base}
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
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.surface,
  },
  twistBanner: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.phosphor,
  },
  twistPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: Colors.phosphor },
  letterBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  optionCard: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: Radius.default,
    backgroundColor: Colors.surface,
    borderWidth: 1,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderRadius: Radius.default,
    backgroundColor: Colors.surface,
    borderWidth: 1,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    padding: 14,
    borderRadius: Radius.default,
    backgroundColor: Colors.surface,
  },
});
